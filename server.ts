import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import youtubedl from "youtube-dl-exec";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { Readable } from "stream";
import { spawn } from "child_process";
import ytSearch from "yt-search";
import axios from "axios";
import * as cheerio from "cheerio";
import {
  fetchNctPlaylistWithProxyRace,
  parseNctHtml,
} from "./server/nctParser";
import {
  fetchTKaraokePlaylist,
  fetchTKaraokeSongDetails,
} from "./server/tkaraokeParser";
import {
  hasYoutubeCookies,
  getCookiesFilePath,
  saveYoutubeCookies,
  getYoutubeCookiesStatus,
} from "./server/youtubeCookieHelper";
import {
  getCachedData,
  setCachedData,
  invalidateCache,
} from "./server/cacheHelper";
import {
  formatLyric,
  improveLyric,
  addChordsLyric,
  bypassLyric,
  arrangeLyric,
  suggestLyricTags,
} from "./server/lyricProcessor";
import { GoogleGenAI } from "@google/genai";

async function resolveFacebookRedirect(url: string): Promise<string> {
  const isFb = url.includes("facebook.com") || url.includes("fb.watch");
  if (!isFb) return url;

  try {
    const userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    if (response.url && response.url !== url) {
      console.log(`[Facebook Redirect] Resolved: ${url} -> ${response.url}`);
      return response.url;
    }
  } catch (err: any) {
    console.error("[Facebook Redirect] Error resolving:", err.message);
  }
  return url;
}

const directStreamMemoryCache = new Map<
  string,
  { url: string; expiresAt: number }
>();
const directStreamInFlightPromises = new Map<string, Promise<string>>();

async function getDirectMediaUrl(url: string, forceRefresh: boolean = false): Promise<string> {
  const now = Date.now();
  if (forceRefresh) {
    directStreamMemoryCache.delete(url);
    directStreamInFlightPromises.delete(url);
  } else {
    const cached = directStreamMemoryCache.get(url);
    if (cached && cached.expiresAt > now) {
      return cached.url;
    }
  }

  let inFlightPromise = directStreamInFlightPromises.get(url);
  if (!inFlightPromise) {
    inFlightPromise = (async () => {
      try {
        if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
          const rawHtml = await fetchNctPlaylistWithProxyRace(url);
          const parsedData = parseNctHtml(rawHtml);
          if (parsedData.songs && parsedData.songs.length > 0) {
            const firstSong = parsedData.songs[0];
            let directAudioUrl = "";
            
            // Prefer the lossless or highest quality explicitly
            if (firstSong.qualities && firstSong.qualities.length > 0) {
                const lossless = firstSong.qualities.find((q: any) => q.quality.includes("lossless") || q.quality.includes("flac"));
                const high = firstSong.qualities.find((q: any) => q.quality.includes("320"));
                const best = lossless || high || firstSong.qualities[0];
                directAudioUrl = best.url;
            }
            if (!directAudioUrl) {
                directAudioUrl = firstSong.audioUrl || firstSong.originalUrl || url;
            }
            
            if (directAudioUrl.includes("/api/proxy-stream?url=")) {
               directAudioUrl = decodeURIComponent(directAudioUrl.split("url=")[1]);
            }
            directStreamMemoryCache.set(url, { url: directAudioUrl, expiresAt: now + 45 * 60 * 1000 });
            return directAudioUrl;
          }
        }
        
        if (url.includes("tkaraoke.com")) {
          const details = await fetchTKaraokeSongDetails(url);
          if (details && details.mp3Versions && details.mp3Versions.length > 0) {
             const audioUrl = details.mp3Versions[0].url;
             directStreamMemoryCache.set(url, { url: audioUrl, expiresAt: now + 45 * 60 * 1000 });
             return audioUrl;
          }
        }

        const ytdlOptions: any = {
          dumpSingleJson: true,
          noWarnings: true,
          noPlaylist: true,
          f: "ba/bestaudio/b",
          jsRuntimes: "node",
          noCheckCertificates: true,
        };

        if (await hasYoutubeCookies()) {
          ytdlOptions.cookies = getCookiesFilePath();
        }

        const info = (await youtubedl(url, ytdlOptions)) as any;
        if (!info || !info.url) {
          throw new Error("No direct stream URL found in media metadata");
        }

        directStreamMemoryCache.set(url, {
          url: info.url,
          expiresAt: Date.now() + 2 * 60 * 60 * 1000, // cache for 2 hours
        });

        return info.url;
      } finally {
        directStreamInFlightPromises.delete(url);
      }
    })();
    directStreamInFlightPromises.set(url, inFlightPromise);
  }

  return inFlightPromise;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));
  app.use(
    "/stems-cache",
    express.static(path.join(process.cwd(), "stems_cache")),
  );

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // API to stream audio of YouTube, Facebook, SoundCloud, etc.
  app.get("/api/stream", async (req, res) => {
    try {
      let url = (req.query.url as string) || "";
      const queryParam = (req.query.query as string) || "";

      if (!url && !queryParam) {
        res.status(400).json({ error: "Invalid stream URL or query" });
        return;
      }
      if (url) {
        url = await resolveFacebookRedirect(url);
      }

      // Skip direct fetch for TikTok pages as they return HTML or block fetch
      const isTikTokPage = url && url.includes("tiktok.com") && !url.includes("tiktokcdn");
      
      let streamServed = false;
      if (url && !isTikTokPage) {
        try {
          const directUrl = await getDirectMediaUrl(url, req.query.force_refresh === "true");
          console.log(
            `[Stream Range Proxy] Streaming direct URL: ${directUrl.substring(0, 80)}...`,
          );
          const headers: Record<string, string> = {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          };
          if (req.headers.range) headers["Range"] = req.headers.range;

          const response = await fetch(directUrl, { headers });
          if (!response.ok || response.headers.get("content-type")?.includes("text/html")) {
            throw new Error(`Direct fetch failed or returned HTML: ${response.status}`);
          }

          res.status(response.status);
          let contentType = response.headers.get("content-type");
          if (contentType) res.setHeader("Content-Type", contentType);
          const contentLength = response.headers.get("content-length");
          if (contentLength) res.setHeader("Content-Length", contentLength);
          const contentRange = response.headers.get("content-range");
          if (contentRange) res.setHeader("Content-Range", contentRange);

          res.setHeader(
            "Accept-Ranges",
            response.headers.get("accept-ranges") || "bytes",
          );
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");

          if (response.body) {
            const nodeStream = require('stream').Readable.fromWeb(response.body as any);
            nodeStream.pipe(res);
            res.on("close", () => nodeStream.destroy());
            streamServed = true;
          }
        } catch (err) {
          console.log("[Stream Proxy] Using yt-dlp extraction strategy.");
        }
      }

      if (!streamServed) {
        const streamTarget = url || `ytsearch1:${queryParam}`;
        const ytDlpArgs = [
          "-f",
          "ba/bestaudio/b/best",
          "-o",
          "-",
          streamTarget,
        ];
        const subprocess = spawn(
          (youtubedl as any).constants.YOUTUBE_DL_PATH,
          ytDlpArgs,
        );
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Transfer-Encoding", "chunked");
        if (subprocess.stdout) {
          subprocess.stdout.pipe(res);
        } else {
          res.status(500).json({ error: "Failed to create audio stream" });
        }
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  app.get("/api/proxy-stream", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      const headers: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };
      if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
        headers["Referer"] = "https://www.nhaccuatui.com/";
        headers["Origin"] = "https://www.nhaccuatui.com";
      }
      if (url.includes("tiktokcdn") || url.includes("tiktok.com")) {
        headers["Referer"] = "https://www.tiktok.com/";
      }
      if (url.includes("tiktokcdn") || url.includes("tiktok.com")) {
        headers["Referer"] = "https://www.tiktok.com/";
      }
      if (req.headers.range) {
        headers["Range"] = req.headers.range;
      }
      const response = await fetch(url, { headers });
      if (!response.ok) {
        console.error(
          `[Proxy Stream] HTTP error fetching ${url}: ${response.status} ${response.statusText}`,
        );
      }
      res.status(response.status);
      let contentType = response.headers.get("content-type");
      if (url.toLowerCase().includes(".flac")) contentType = "audio/flac";
      if (contentType) res.setHeader("Content-Type", contentType);
      const contentLength = response.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);
      const contentRange = response.headers.get("content-range");
      if (contentRange) res.setHeader("Content-Range", contentRange);
      res.setHeader(
        "Accept-Ranges",
        response.headers.get("accept-ranges") || "bytes",
      );
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.pipe(res);
        res.on("close", () => nodeStream.destroy());
      } else {
        res.status(500).json({ error: "No body in audio stream source." });
      }
    } catch (error: any) {
      console.error(
        `[Proxy Stream] Exception fetching ${req.query.url}:`,
        error,
      );
      if (!res.headersSent) {
        res
          .status(500)
          .json({ error: error.message || "Failed to proxy stream." });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  });

  const hfClientCache = new Map<string, any>();

  app.get("/api/proxy-stem", async (req, res) => {
    try {
      const url = req.query.url as string;
      const space = (req.query.space as string) || "tienqnguyen95/Stemmix";
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      console.log(
        `[Proxy Stem] Fetching "${url}" via hfApp on space "${space}"`,
      );

      let hfApp = hfClientCache.get(space);
      if (!hfApp) {
        const { client } = await import("@gradio/client");
        hfApp = await client(space as any);
        hfClientCache.set(space, hfApp);
      }

      const response = await hfApp.fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch from HF: ${response.status} ${response.statusText}`,
        );
      }

      res.status(response.status);

      let contentType = response.headers.get("content-type") || "audio/wav";
      res.setHeader("Content-Type", contentType);

      const contentLength = response.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);

      const contentRange = response.headers.get("content-range");
      if (contentRange) res.setHeader("Content-Range", contentRange);

      res.setHeader(
        "Accept-Ranges",
        response.headers.get("accept-ranges") || "bytes",
      );
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");

      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.pipe(res);
        res.on("close", () => nodeStream.destroy());
      } else {
        res.status(500).json({ error: "No body in HF stream source." });
      }
    } catch (error: any) {
      console.error(`[Proxy Stem Error]`, error);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ error: error.message || "Failed to proxy HF stem." });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  });

  const upload = multer({ storage: multer.memoryStorage() });
  app.post("/api/stemmix", upload.single("audio_file"), async (req, res) => {
    try {
      let audioUrl = req.body.audioUrl;
      let targetUrl = audioUrl;
      let blob;

      if (req.file) {
        // Uploaded file
        blob = new Blob([req.file.buffer]);
        console.log(
          `[Stemmix] Received uploaded file: ${req.file.originalname} (${blob.size} bytes)`,
        );
        targetUrl = "uploaded_file";
      } else {
        if (!audioUrl) {
          return res
            .status(400)
            .json({ error: "No audio URL or file provided" });
        }
        if (targetUrl && targetUrl.startsWith("blob:")) {
          return res
            .status(400)
            .json({
              error:
                "Cannot process browser local blob URLs on the server. Please ensure the local file is uploaded.",
            });
        }
        console.log(`[Stemmix] Separating stems for: ${audioUrl}`);

        const headers = {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        };
        if (targetUrl.includes("/api/proxy-stream?url=")) {
          targetUrl = decodeURIComponent(targetUrl.split("url=")[1]);
          headers["Referer"] = "https://www.nhaccuatui.com/";
          headers["Origin"] = "https://www.nhaccuatui.com";
        } else if (targetUrl.startsWith("/")) {
          targetUrl = `http://localhost:3000${targetUrl}`;
        }
        console.log(`[Stemmix] Fetching audio from: ${targetUrl}`);
        const audioResponse = await fetch(targetUrl, { headers });
        if (!audioResponse.ok) {
          throw new Error(
            `Failed to fetch audio for Stemmix. Status: ${audioResponse.status}`,
          );
        }
        const arrayBuffer = await audioResponse.arrayBuffer();
        blob = new Blob([arrayBuffer]);
        console.log(
          `[Stemmix] Downloaded audio blob: ${blob.size} bytes. Initiating HF separation...`,
        );
      }

      const { client, handle_file } = await import("@gradio/client");
      let hfApp;
      let result;
      let success = false;
      let errorMsg = "";

      const spaces = [
        "sociallyclever/demucs",
        "PeachJed/Stemmix",
        "tienqnguyen95/Stemmix",
        "vumichien/demucs",
        "akhaliq/demucs",
        "fabiocarrilho/demucs",
      ];
      const customSpace = req.body.customSpace;
      if (
        customSpace &&
        typeof customSpace === "string" &&
        customSpace.trim()
      ) {
        const cleaned = customSpace.trim();
        if (!spaces.includes(cleaned)) {
          spaces.unshift(cleaned);
        }
      }

      const runSeparation = async () => {
        // Find primary space to try first
        let primarySpace = "tienqnguyen95/Stemmix";
        if (
          customSpace &&
          typeof customSpace === "string" &&
          customSpace.trim()
        ) {
          primarySpace = customSpace.trim();
        }

        try {
          console.log(
            `[Stemmix] Attempting primary Hugging Face Space: ${primarySpace}`,
          );
          const hfApp = await client(primarySpace as any);
          const res = await hfApp.predict("/separate_stems", {
            audio_file: handle_file(blob),
          });
          if (res && res.data) {
            console.log(
              `[Stemmix] Successfully separated stems using primary Space: ${primarySpace}`,
            );
            return { res, space: primarySpace, hfApp };
          }
        } catch (e: any) {
          console.warn(
            `[Stemmix] Primary space ${primarySpace} failed or is offline:`,
            e.message || e,
          );
        }

        // Fallback: run remaining top spaces sequentially to save bandwidth and prevent parallel spam
        const remainingSpaces = spaces
          .filter((s) => s !== primarySpace)
          .slice(0, 3);
        for (const space of remainingSpaces) {
          try {
            console.log(
              `[Stemmix] Attempting fallback Hugging Face Space: ${space}`,
            );
            const hfApp = await client(space as any);
            const res = await hfApp.predict("/separate_stems", {
              audio_file: handle_file(blob),
            });
            if (res && res.data) {
              console.log(
                `[Stemmix] Successfully separated stems using fallback Space: ${space}`,
              );
              return { res, space, hfApp };
            }
          } catch (e: any) {
            console.warn(
              `[Stemmix] Fallback space ${space} failed:`,
              e.message || e,
            );
          }
        }
        console.log(
          `[Stemmix] All AI models unavailable, switching to local DSP/WebGPU mode`,
        );
        return null;
      };

      try {
        result = await Promise.race([
          runSeparation(),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "AI Cloud processing took too long. Falling back to local DSP.",
                  ),
                ),
              180000,
            ),
          ),
        ]);
        if (result && result.res && result.res.data) {
          success = true;
        }
      } catch (timeoutErr) {
        console.warn("[Stemmix] Timeout:", timeoutErr.message);
      }

      if (success && result && result.res && result.res.data) {
        console.log(
          `[Stemmix] AI separation result data:`,
          JSON.stringify(result.res.data, null, 2),
        );
        const spaceUrl = `https://${result.space.replace("/", "-")}.hf.space`;
        const getUrl = (item: any) => {
          if (!item) return null;
          let u = typeof item === "string" ? item : item.url || item.path;
          if (
            !u ||
            typeof u !== "string" ||
            (!u.includes("hf.space") &&
              !u.startsWith("http") &&
              !u.startsWith("/"))
          ) {
            return null; // Ignore non-url strings
          }
          if (
            u.startsWith("http://127.0.0.1") ||
            u.startsWith("http://localhost") ||
            u.startsWith("http://0.0.0.0")
          ) {
            const urlObj = new URL(u);
            u = `${spaceUrl}${urlObj.pathname}${urlObj.search}`;
          } else if (u.startsWith("/")) {
            u = `${spaceUrl}${u}`;
          }
          return u;
        };

        let vocals, drums, bass, guitar, piano, other;
        if (Array.isArray(result.res.data)) {
          for (const item of result.res.data) {
            if (item && typeof item === "object" && item.orig_name) {
              const name = item.orig_name.toLowerCase();
              const u = getUrl(item);
              if (!u) continue;

              if (name.includes("vocal")) vocals = u;
              else if (name.includes("drum")) drums = u;
              else if (name.includes("bass")) bass = u;
              else if (name.includes("guitar")) guitar = u;
              else if (name.includes("piano")) piano = u;
              else if (name.includes("other")) other = u;
            }
          }
        }

        if (
          !vocals &&
          !drums &&
          !bass &&
          !other &&
          Array.isArray(result.res.data)
        ) {
          // Fallback if the space doesn't use orig_name or returns strings/simple objects
          // Assuming typical output order if the first item isn't a string message
          let offset = 0;
          if (
            result.res.data.length > 2 &&
            (typeof result.res.data[0] === "string" ||
              (result.res.data[0] && result.res.data[0].__type__ === "update"))
          ) {
            offset = 2;
          }
          vocals = getUrl(result.res.data[offset]);
          drums = getUrl(result.res.data[offset + 1]);
          bass = getUrl(result.res.data[offset + 2]);
          other = getUrl(result.res.data[offset + 3]);
          guitar = getUrl(result.res.data[offset + 4]);
          piano = getUrl(result.res.data[offset + 5]);
        }

        // Cache the hfApp client instance for instant proxying
        hfClientCache.set(result.space, result.hfApp);

        const formatProxyUrl = (u?: string) => {
          if (!u) return null;
          return `/api/proxy-stem?url=${encodeURIComponent(u)}&space=${encodeURIComponent(result.space)}`;
        };

        const stems = {
          status: "Success",
          vocals: formatProxyUrl(vocals),
          drums: formatProxyUrl(drums),
          bass: formatProxyUrl(bass),
          guitar: formatProxyUrl(guitar),
          piano: formatProxyUrl(piano),
          other: formatProxyUrl(other),
          isDspFallback: false,
        };
        console.log(
          `[Stemmix] AI separation succeeded using Space: ${result.space}. Returned instant streaming URLs.`,
        );
        return res.json({ success: true, stems });
      }

      console.log(`[Stemmix] AI separation spaces failed.`);
      return res.status(400).json({
        success: false,
        error:
          "AI Cloud servers are currently overloaded or offline. Please select the ⚡ WebGPU mode to process it locally.",
      });
    } catch (error) {
      console.error("[Stemmix Error]", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to separate stems" });
    }
  });


  app.get("/api/nhaccuatui/albums", async (req, res) => {
    try {
      const cacheKey = "nct_home_albums";
      const cached = await getCachedData<any>("nct_albums", cacheKey);
      if (cached) {
        return res.json({ success: true, albums: cached });
      }

      const response = await fetch('https://www.nhaccuatui.com/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const html = await response.text();
      
      const match = html.match(/<script type=\"application\/json\" data-nuxt-data=\"nuxt-app\"[^>]*>(.*?)<\/script>/s);
      let results: any[] = [];
      if (match) {
        const data = JSON.parse(match[1]);
        for (let i = 0; i < data.length; i++) {
            if (typeof data[i] === 'string' && data[i].length === 12 && /^[a-zA-Z0-9]+$/.test(data[i])) {
                let title = null;
                let image = null;
                for (let j = 1; j <= 10; j++) {
                   if (!title && typeof data[i+j] === 'string' && data[i+j].length > 5 && !data[i+j].startsWith('http')) {
                       title = data[i+j];
                   }
                   if (!image && typeof data[i+j] === 'string' && data[i+j].includes('image-cdn.nct.vn/playlist')) {
                       image = data[i+j];
                   }
                }
                if (title && image && !results.find(r => r.id === data[i])) {
                    results.push({ id: data[i], title, image });
                }
            }
        }
      }

      if (results.length > 0) {
        // Cache for 24 hours
        await setCachedData("nct_albums", cacheKey, results);
        return res.json({ success: true, albums: results });
      } else {
        return res.status(500).json({ success: false, error: "No albums found" });
      }
    } catch (error: any) {
      console.error("[NCT Albums Error]", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/nhaccuatui/playlist", async (req, res) => {
    try {
      const playlistUrl = req.query.url as string;
      const forceRefresh = req.query.refresh === "true";

      if (!playlistUrl) {
        return res
          .status(400)
          .json({ error: "NhacCuaTui playlist URL is required." });
      }

      if (forceRefresh) {
        await invalidateCache("nct_playlist", playlistUrl);
      } else {
        const cached = await getCachedData<any>("nct_playlist", playlistUrl);
        if (cached) {
          console.log(
            `[API] Serving CACHED NhacCuaTui playlist: ${playlistUrl}`,
          );
          return res.json({ success: true, data: cached });
        }
      }

      console.log(`[API] Fetching NhacCuaTui playlist: ${playlistUrl}`);
      const rawHtml = await fetchNctPlaylistWithProxyRace(playlistUrl);
      const parsedData = parseNctHtml(rawHtml);

      if (parsedData && parsedData.songs && parsedData.songs.length > 0) {
        await setCachedData("nct_playlist", playlistUrl, parsedData);
      }

      res.json({
        success: true,
        data: parsedData,
      });
    } catch (error: any) {
      console.error("[API NCT Error]", error.message);
      res.status(500).json({
        success: false,
        error:
          error.message ||
          "Failed to retrieve NhacCuaTui playlist details. The service might be temporarily geoblocked or overloaded.",
      });
    }
  });

  // API to parse manual HTML from a pasted string
  app.post("/api/nhaccuatui/manual", async (req, res) => {
    try {
      const htmlText = req.body.htmlText as string;
      if (!htmlText) {
        return res.status(400).json({ error: "NCT HTML content is required." });
      }

      console.log("[API] Parsing manually posted NhacCuaTui HTML...");
      const parsedData = parseNctHtml(htmlText);

      res.json({
        success: true,
        data: parsedData,
      });
    } catch (error: any) {
      console.error("[API NCT Manual Error]", error.message);
      res.status(400).json({
        success: false,
        error:
          error.message ||
          "Failed to parse NhacCuaTui page source HTML. Make sure you copied the correct source.",
      });
    }
  });

  // API to fetch from NhacCuaTui link OR a custom list, save it to file, and set as default songs list
  app.post("/api/nhaccuatui/save-default", async (req, res) => {
    try {
      const { url, songs } = req.body;
      let songsToSave = songs;

      if (url) {
        console.log(`[API Save Default] Fetching and parsing NCT URL: ${url}`);
        const rawHtml = await fetchNctPlaylistWithProxyRace(url);
        const parsedData = parseNctHtml(rawHtml);
        songsToSave = parsedData.songs;
      }

      if (
        !songsToSave ||
        !Array.isArray(songsToSave) ||
        songsToSave.length === 0
      ) {
        return res
          .status(400)
          .json({
            error:
              "Song list is empty or invalid. Make sure the playlist contains tracks.",
          });
      }

      const configPath = path.join(
        process.cwd(),
        "default_playlist_config.json",
      );
      await fs.writeFile(
        configPath,
        JSON.stringify(songsToSave, null, 2),
        "utf8",
      );

      console.log(
        `[API] Default playlist updated with ${songsToSave.length} songs and saved to file.`,
      );
      res.json({
        success: true,
        message: "Playlist successfully set as default!",
        songs: songsToSave,
      });
    } catch (error: any) {
      console.error("[API NCT Save Default Error]", error.message);
      res
        .status(500)
        .json({
          success: false,
          error: error.message || "Failed to save playlist as default.",
        });
    }
  });

  // API to retrieve the set default songs list
  app.get("/api/default-songs", async (req, res) => {
    try {
      const configPath = path.join(
        process.cwd(),
        "default_playlist_config.json",
      );
      if (existsSync(configPath)) {
        const content = await fs.readFile(configPath, "utf8");
        const songs = JSON.parse(content);
        return res.json({ success: true, songs });
      }
      res.json({ success: true, songs: [] });
    } catch (error: any) {
      console.error("[API Get Default Songs Error]", error.message);
      res
        .status(500)
        .json({
          success: false,
          error: error.message || "Failed to retrieve default songs.",
          songs: [],
        });
    }
  });

  // GET community tracks
  app.get("/api/community/tracks", async (req, res) => {
    try {
      const dbPath = path.join(process.cwd(), "community_tracks.json");
      let tracks: any[] = [];

      // Seed with some awesome default track entries if the database doesn't exist
      if (!existsSync(dbPath)) {
        tracks = [
          {
            id: "comm_seed1",
            title: "Em (feat. SOOBIN) - Classic Vibe",
            author: "Binz, SOOBIN",
            cover:
              "https://image-cdn.nct.vn/song/2026/05/21/t/a/x/v/1779370796566.jpg",
            duration: 296,
            audioUrl: "https://stream.nct.vn/resa/2605/a4/52/96myxlw2bg.mp3?st=G5iXoDQWnWgHmtXbfr2ucQ&e=1781276871&a=6&p=0&r=885ad4649ef1d80dd7233f228343a253",
            originalUrl: "https://www.nhaccuatui.com/song/xLLyzXlyrRLa.html",
            sharedBy: "Acoustic System",
            sharedAt: new Date().toISOString(),
            likes: 15,
          },
          {
            id: "comm_seed2",
            title: "Lofi Hip Hop Radio 📚 Beats to Study/Relax to",
            author: "Lofi Girl",
            cover:
              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300",
            duration: 3600,
            audioUrl:
              "/api/stream?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DjfKfPfyJRdk",
            originalUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
            sharedBy: "Lofi Team",
            sharedAt: new Date().toISOString(),
            likes: 24,
          },
        ];
        await fs.writeFile(dbPath, JSON.stringify(tracks, null, 2), "utf-8");
      } else {
        const content = await fs.readFile(dbPath, "utf-8");
        tracks = JSON.parse(content);
      }

      res.json({ success: true, tracks });
    } catch (error: any) {
      console.error("[API GET Tracks Error]", error.message);
      res
        .status(500)
        .json({
          success: false,
          error: error.message || "Failed to retrieve community tracks.",
          tracks: [],
        });
    }
  });

  // POST share community track
  app.post("/api/community/share", async (req, res) => {
    try {
      let { url, title, author, cover, duration, sharedBy } = req.body;
      if (!url || typeof url !== "string") {
        return res
          .status(400)
          .json({ success: false, error: "Valid URL is required." });
      }

      url = url.trim();
      sharedBy = sharedBy?.trim() || "Acoustic Lover";

      // If we don't have enough metadata, let's fetch it dynamically
      if (!title || !cover) {
        console.log(`[Community Share] Resolving metadata for URL: ${url}`);
        if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
          try {
            const rawHtml = await fetchNctPlaylistWithProxyRace(url);
            const parsedData = parseNctHtml(rawHtml);
            if (parsedData.songs && parsedData.songs.length > 0) {
              const firstSong = parsedData.songs[0];
              title = title || firstSong.title;
              author = author || firstSong.author;
              cover = cover || firstSong.cover;
              duration = duration || firstSong.duration;
            }
          } catch (e: any) {
            console.warn(
              "[Community Share] Fallback NCT parsing issue:",
              e.message,
            );
          }
        } else {
          try {
            const urlToFetch = await resolveFacebookRedirect(url);
            const ytdlOptions: any = {
              dumpSingleJson: true,
              noWarnings: true,
              noPlaylist: true,
              f: "all",
              jsRuntimes: "node",
              noCheckCertificates: true,
            };
            if (await hasYoutubeCookies()) {
              ytdlOptions.cookies = getCookiesFilePath();
            }
            const info = (await youtubedl(urlToFetch, ytdlOptions)) as any;
            title = title || info.title;
            cover = cover || info.thumbnail || info.thumbnails?.[0]?.url;
            author = author || info.uploader || info.artist;
            duration = duration || info.duration;
          } catch (e: any) {
            console.warn(
              "[Community Share] Fallback yt-dlp metadata issue:",
              e.message,
            );
          }
        }
      }

      // Default fallbacks in case both parsing and direct values are missing
      title = title || "Shared Web Clip";
      author = author || "Acoustic Community";
      cover =
        cover ||
        "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300";
      duration = duration || 180;

      // Unify stream routes cleanly
      let audioUrl = `/api/stream?url=${encodeURIComponent(url)}`;

      const songObj = {
        id:
          "comm_" +
          Math.random().toString(36).substring(2, 10) +
          "_" +
          Date.now(),
        title,
        author,
        cover,
        duration,
        audioUrl,
        originalUrl: url,
        sharedBy,
        sharedAt: new Date().toISOString(),
        likes: 0,
      };

      const dbPath = path.join(process.cwd(), "community_tracks.json");
      let tracks: any[] = [];
      if (existsSync(dbPath)) {
        try {
          const content = await fs.readFile(dbPath, "utf-8");
          tracks = JSON.parse(content);
        } catch {
          tracks = [];
        }
      }

      // Check if URL is already shared
      const existingIndex = tracks.findIndex((t) => t.originalUrl === url);
      if (existingIndex !== -1) {
        // Update contributor or bump shared time
        tracks[existingIndex] = {
          ...tracks[existingIndex],
          title: songObj.title,
          author: songObj.author,
          cover: songObj.cover,
          sharedBy: songObj.sharedBy,
          sharedAt: songObj.sharedAt,
        };
      } else {
        tracks.unshift(songObj);
      }

      await fs.writeFile(dbPath, JSON.stringify(tracks, null, 2), "utf-8");
      res.json({ success: true, track: songObj });
    } catch (error: any) {
      console.error("[API Community Share Error]", error.message);
      res
        .status(500)
        .json({
          success: false,
          error: error.message || "Failed to share track to community.",
        });
    }
  });

  // POST like community track
  app.post("/api/community/like", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Track ID is required" });
      }
      const dbPath = path.join(process.cwd(), "community_tracks.json");
      if (!existsSync(dbPath)) {
        return res.status(404).json({ error: "No tracks list found" });
      }
      const content = await fs.readFile(dbPath, "utf-8");
      const tracks = JSON.parse(content);
      const track = tracks.find((t: any) => t.id === id);
      if (track) {
        track.likes = (track.likes || 0) + 1;
        await fs.writeFile(dbPath, JSON.stringify(tracks, null, 2), "utf-8");
        return res.json({ success: true, likes: track.likes });
      }
      res.status(404).json({ error: "Track not found" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API to save and update youtube cookies to bypass restrictions
  app.post("/api/youtube/cookies", async (req, res) => {
    try {
      const { cookiesText } = req.body;
      if (cookiesText === undefined) {
        return res.status(400).json({ error: "cookiesText field is required" });
      }
      const loaded = await saveYoutubeCookies(cookiesText);
      const status = await getYoutubeCookiesStatus();
      res.json({
        success: true,
        message: loaded
          ? "Cookies saved and parsed successfully!"
          : "Cookies cleared.",
        status,
      });
    } catch (error: any) {
      console.error("[API Cookies Error]", error.message);
      res
        .status(500)
        .json({
          success: false,
          error: error.message || "Failed to save cookies",
        });
    }
  });

  // API to get current youtube cookies status
  app.get("/api/youtube/cookies", async (req, res) => {
    try {
      const status = await getYoutubeCookiesStatus();
      res.json({ success: true, status });
    } catch (error: any) {
      console.error("[API Cookies Status Error]", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/tiktok/user", async (req, res) => {
    try {
      const unique_id = req.query.unique_id as string;
      const clientCursor = (req.query.cursor as string) || "0";
      const clientCount = (req.query.count as string) || "50";
      const forceRefresh = req.query.refresh === "true";

      if (!unique_id) {
        return res.status(400).json({ error: "Username is required" });
      }

      const cacheKey = `${unique_id}_${clientCursor}_${clientCount}`;
      if (forceRefresh) {
        await invalidateCache("tiktok_user", cacheKey);
      } else {
        const cached = await getCachedData<any>("tiktok_user", cacheKey);
        if (cached) {
          console.log(`[API] Serving CACHED TikTok user: ${unique_id}`);
          return res.json(cached);
        }
      }

      const strategies = [
        // Strategy 1: tikwm user posts API with pagination
        async () => {
          const params = new URLSearchParams({
            unique_id,
            count: clientCount,
            cursor: clientCursor,
          });
          const response = await fetch("https://www.tikwm.com/api/user/posts", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
          });
          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            throw new Error("TikTok API is currently blocked by Cloudflare. Please try again later.");
          }
          if (data.code === 0 && data.data?.videos?.length > 0) {
            return {
              videos: data.data.videos,
              cursor: (data.data.cursor || "").toString(),
              hasMore: !!data.data.hasMore,
            };
          }
          throw new Error("TikWM user API failed");
        },
        // Strategy 2: tikwm feed search fallback
        async () => {
          let allVideos: any[] = [];
          let currentCursor = clientCursor;
          let hasMoreResult = false;

          for (let i = 0; i < 4; i++) {
            const params = new URLSearchParams({
              keywords: `@${unique_id}`,
              count: "30",
              cursor: currentCursor,
            });
            const response = await fetch(
              "https://www.tikwm.com/api/feed/search",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params.toString(),
              },
            );
            const text = await response.text();
            let data;
            try {
              data = JSON.parse(text);
            } catch (e) {
              break;
            }

            if (data.code === 0 && data.data?.videos?.length > 0) {
              const filtered = data.data.videos.filter(
                (v: any) =>
                  v.author?.unique_id?.toLowerCase() ===
                  unique_id.toLowerCase(),
              );

              const currentIds = new Set(
                allVideos.map((v) => v.video_id || v.id),
              );
              const newVideos = filtered.filter(
                (v: any) => !currentIds.has(v.video_id || v.id),
              );
              allVideos.push(...newVideos);

              currentCursor = (data.data.cursor || 0).toString();
              hasMoreResult = !!data.data.hasMore;
              if (
                allVideos.length >= parseInt(clientCount) ||
                !data.data.hasMore
              ) {
                break;
              }
            } else {
              break;
            }
          }

          if (allVideos.length > 0) {
            return {
              videos: allVideos,
              cursor: currentCursor,
              hasMore: hasMoreResult,
            };
          }
          throw new Error("TikWM search fallback failed");
        },
        // Strategy 4: yt-dlp backend
        async () => {
          const ytdlOptions: any = {
            dumpSingleJson: true,
            flatPlaylist: true,
            noWarnings: true,
            jsRuntimes: "node",
            noCheckCertificates: true,
            playlistEnd: parseInt(clientCount) || 40,
          };
          if (await hasYoutubeCookies()) {
            ytdlOptions.cookies = getCookiesFilePath();
          }
          
          const profileUrl = `https://www.tiktok.com/@${unique_id}`;
          console.log(`[Strategy 4] Using yt-dlp to fetch TikTok profile: ${profileUrl}`);
          const info = await youtubedl(profileUrl, ytdlOptions) as any;
          
          if (info && info.entries && info.entries.length > 0) {
            const mappedVideos = info.entries.map((entry) => {
              const videoUrl = entry.url || `https://www.tiktok.com/@${unique_id}/video/${entry.id}`;
              return {
                video_id: entry.id,
                title: entry.title || "TikTok Video",
                audioUrl: `/api/stream?url=${encodeURIComponent(videoUrl)}`,
                cover: entry.thumbnails?.[0]?.url || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300",
                author: {
                  unique_id: unique_id,
                  nickname: entry.uploader || unique_id
                }
              };
            });
            
            return {
              videos: mappedVideos,
              cursor: "0",
              hasMore: false,
            };
          }
          throw new Error("yt-dlp strategy returned 0 items");
        },
        
        // Strategy 3: HTML fetch + proxy via AllOrigins
        async () => {
          const audioUrl = `https://www.tiktok.com/@${unique_id}`;
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(audioUrl)}`;
          const response = await fetch(proxyUrl);
          const data = await response.json();
          const html = data.contents;
          if (typeof html !== "string") throw new Error("Html proxy failed");

          const match = html.match(
            /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)<\/script>/,
          );
          if (match) {
            const parsed = JSON.parse(match[1]);
            const itemList =
              parsed?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo
                ?.itemList;
            if (itemList && Array.isArray(itemList) && itemList.length > 0) {
              return {
                videos: itemList,
                cursor: "0",
                hasMore: false,
              };
            }
          }
          throw new Error("HTML fetch scraping failed or returned 0 items");
        },
      ];

      for (const executeStrategy of strategies) {
        try {
          const result = await executeStrategy();
          if (result && result.videos && result.videos.length > 0) {
            const finalResult = {
              code: 0,
              data: {
                videos: result.videos,
                cursor: result.cursor,
                hasMore: result.hasMore,
              },
            };
            await setCachedData("tiktok_user", cacheKey, finalResult);
            res.json(finalResult);
            return;
          }
        } catch (e) {
          // ignore strategy failure, move to next
        }
      }

      // If all strategies fail
      res.status(500).json({
        error:
          "Failed to extract user posts. Cloudflare/Captcha blocked all scraping strategies (Direct API, Proxy, and HTML Fetch).",
        isCloudflareBlock: true,
      });
      return;
    } catch (err: any) {
      res.status(500).json({ error: err.message });
      return;
    }
  });

  // 1. YouTube Search
  app.get("/api/youtube/search", async (req, res) => {
    try {
      const keywords = req.query.q as string;
      if (!keywords) {
        return res.status(400).json({ error: "Search query is required" });
      }

      // Add timeout to ytSearch to prevent infinite hanging
      const r = (await Promise.race([
        ytSearch(keywords),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("YouTube search timeout")), 8000),
        ),
      ])) as any;

      const videos = r.videos.slice(0, 30).map((v: any) => ({
        id: v.videoId,
        title: v.title,
        url: v.url,
        author: v.author.name,
        duration: v.duration.seconds,
        cover: v.thumbnail,
      }));

      res.json({ videos });
    } catch (error: any) {
      console.error("[YouTube Search Error]", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. TikTok Search (Real TikTok Creator & Viral Indexer)
  app.get("/api/tiktok/search", async (req, res) => {
    try {
      const keywords = ((req.query.q as string) || "").trim();
      const clientCursor = (req.query.cursor as string) || "0";
      const clientCount = (req.query.count as string) || "20";
      const searchType = (req.query.type as string) || "video";

      if (!keywords) {
        return res.status(400).json({ error: "Search query is required" });
      }

      const cacheKey = `search_${searchType}_${keywords.toLowerCase()}_${clientCursor}`;
      const cached = await getCachedData<any>("tiktok_search", cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Strategy 1: Direct Creator / User lookup if query starts with @ or is a handle / TikTok URL
      const cleanUser = keywords
        .replace(/^@/, "")
        .replace(/^https?:\/\/(?:www\.)?tiktok\.com\/@/i, "")
        .split(/[/?#]/)[0]
        .trim();

      if (keywords.startsWith("@") || keywords.includes("tiktok.com/@")) {
        try {
          const profileUrl = `https://www.tiktok.com/@${cleanUser}`;
          console.log(`[TikTok Search] Direct profile query: ${profileUrl}`);
          const ytdlOptions: any = {
            dumpSingleJson: true,
            flatPlaylist: true,
            playlistEnd: parseInt(clientCount) || 20,
            noWarnings: true,
          };
          const info = (await youtubedl(profileUrl, ytdlOptions)) as any;
          if (info && info.entries && info.entries.length > 0) {
            const videos = info.entries.map((entry: any) => {
              const videoUrl = entry.url || `https://www.tiktok.com/@${cleanUser}/video/${entry.id}`;
              const bestThumb = Array.isArray(entry.thumbnails) && entry.thumbnails.length > 0
                ? entry.thumbnails[entry.thumbnails.length - 1]?.url || entry.thumbnails[0]?.url
                : `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300`;
              return {
                id: entry.id,
                video_id: entry.id,
                title: entry.title || `${cleanUser} TikTok Video`,
                desc: entry.description || entry.title || `#${cleanUser}`,
                url: videoUrl,
                audioUrl: `/api/stream?url=${encodeURIComponent(videoUrl)}`,
                author: {
                  nickname: entry.uploader || cleanUser,
                  unique_id: `@${cleanUser}`,
                },
                duration: entry.duration || 30,
                cover: bestThumb,
                source: "tiktok",
              };
            });
            const responseData = { videos, cursor: "0", hasMore: false };
            await setCachedData("tiktok_search", cacheKey, responseData);
            return res.json(responseData);
          }
        } catch (e: any) {
          console.log(`[TikTok Search] Profile query skipped: ${e.message}`);
        }
      }

      // Strategy 2: TikWM API attempt
      try {
        const params = new URLSearchParams({
          keywords,
          count: clientCount,
          cursor: clientCursor,
          type: searchType === "sound" ? "music" : "1",
        });

        const response = await fetch("https://www.tikwm.com/api/feed/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "okhttp/4.9.2",
          },
          body: params.toString(),
        });

        const text = await response.text();
        const data = JSON.parse(text);
        if (data.code === 0 && data.data?.videos?.length > 0) {
          const videos = data.data.videos.map((v: any) => ({
            id: v.video_id || v.id,
            video_id: v.video_id || v.id,
            title: v.title || (v.music_info && v.music_info.title) || "TikTok Audio",
            desc: v.title || v.desc,
            url: v.play || `https://www.tiktok.com/@${v.author?.unique_id || 'user'}/video/${v.video_id || v.id}`,
            audioUrl: v.music || (v.music_info && v.music_info.play) || `/api/stream?url=${encodeURIComponent(`https://www.tiktok.com/@${v.author?.unique_id || 'user'}/video/${v.video_id || v.id}`)}`,
            author: {
              nickname: v.author?.nickname || v.author?.unique_id || "TikTok Creator",
              unique_id: `@${v.author?.unique_id || 'creator'}`,
              avatar: v.author?.avatar,
            },
            duration: v.duration || 30,
            cover: v.cover || v.origin_cover || (v.music_info && v.music_info.cover),
            source: "tiktok",
          }));
          const responseData = {
            videos,
            cursor: (data.data.cursor || "").toString(),
            hasMore: !!data.data.hasMore,
          };
          await setCachedData("tiktok_search", cacheKey, responseData);
          return res.json(responseData);
        }
      } catch (tikwmErr) {
        // TikWM unvailable or blocked
      }


            // Strategy 3: Direct yt-dlp on mapped TikTok user URL (since yt-dlp does not support search)
      try {
        const cleanKeyword = keywords.replace(/[^a-zA-Z0-9_]/g, "");
        const searchUrl = `https://www.tiktok.com/@${cleanKeyword || "tiktok"}`;
        console.log(`[TikTok Search] Direct search query via yt-dlp: ${searchUrl}`);
        const ytdlOptions = {
          dumpSingleJson: true,
          flatPlaylist: true,
          playlistEnd: parseInt(clientCount) || 20,
          noWarnings: true,
        };
        const info = (await youtubedl(searchUrl, ytdlOptions)) as any;
        if (info && info.entries && info.entries.length > 0) {
          const videos = info.entries.map((entry, idx) => {
            const videoUrl = entry.url || `https://www.tiktok.com/@${entry.uploader || "user"}/video/${entry.id}`;
            const bestThumb = Array.isArray(entry.thumbnails) && entry.thumbnails.length > 0
              ? entry.thumbnails[entry.thumbnails.length - 1]?.url || entry.thumbnails[0]?.url
              : `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300`;
            return {
              id: entry.id || `tt_${idx}`,
              video_id: entry.id || `tt_${idx}`,
              title: entry.title || `${keywords} TikTok Search`,
              desc: entry.description || entry.title || `#${keywords}`,
              url: videoUrl,
              audioUrl: `/api/stream?url=${encodeURIComponent(videoUrl)}`,
              author: {
                nickname: entry.uploader || "Creator",
                unique_id: `@${entry.uploader || "creator"}`,
              },
              duration: entry.duration || 30,
              cover: bestThumb,
              source: "tiktok",
            };
          });
          const responseData = { videos, cursor: "0", hasMore: false };
          await setCachedData("tiktok_search", cacheKey, responseData);
          return res.json(responseData);
        }
      } catch (searchErr: any) {
        console.warn(`[TikTok Search] yt-dlp query failed for mapped user url`);
      }

      return res.json({ videos: [], cursor: "0", hasMore: false });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to search TikTok" });
    }
  });

  // 3. Real NCT (Nhaccuatui) Proxy Search
  app.get("/api/nct-search", async (req, res) => {
    try {
      const { q, pageindex = 1, pagesize = 50 } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Query 'q' is required" });
      }

      const url = `https://graph.nhaccuatui.com/api/v1/search/song?keyword=${encodeURIComponent(q)}&pageindex=${pageindex}&pagesize=${pagesize}&correct=false&timestamp=${Date.now()}`;

      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
        },
      });

      const songs = response.data?.data?.songs || [];
      const videos = songs.map((s: any) => {
        let bestStreamUrl = "";
        let bestScore = -1;
        let qualityLabel = "STD";

        if (s.streamURL && Array.isArray(s.streamURL)) {
          for (const st of s.streamURL) {
            if (!st.stream) continue;
            let score = 0;
            if (st.type === "320")
              score = 3; // 320kbps is best playable
            else if (st.type === "128") score = 2;
            else if (st.type === "lossless") score = 1; // Demote FLAC to lowest priority (usually VIP/fails)

            if (score > bestScore) {
              bestScore = score;
              bestStreamUrl = st.stream;
              qualityLabel =
                st.typeUI ||
                (st.type === "lossless" ? "LOSSLESS" : `${st.type}kbps`);
            }
          }
        }
        return {
          id: s.key,
          title: s.name,
          author: s.artistName,
          cover: s.bgImage || s.image,
          duration: s.duration || 0,
          url: bestStreamUrl,
          nctLink: s.linkShare,
          quality: qualityLabel,
        };
      });
      res.json({ videos });
    } catch (error: any) {
      console.error("NCT Search Proxy Error:", error.message);
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  // 4. NCT YouTube Fallback ("Audio" Tab)
  app.get("/api/nhaccuatui/search", async (req, res) => {
    try {
      const keywords = req.query.q as string;
      if (!keywords) {
        return res.status(400).json({ error: "Search query is required" });
      }

      // NCT API is occasionally down due to Cloudflare updates,
      // routing to YouTube as a high-quality fallback for Vietnamese music
      const r = (await Promise.race([
        ytSearch(`${keywords} nhaccuatui`),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("YouTube search timeout (NCT fallback)")),
            8000,
          ),
        ),
      ])) as any;

      const videos = r.videos.slice(0, 30).map((v: any) => ({
        id: "nct_" + v.videoId,
        title: v.title.replace(/nhaccuatui/gi, "").trim() || v.title,
        url: v.url, // Keep as youtube URL so the audio streamer yt-dlp can play it!
        nctLink: `https://www.nhaccuatui.com/tim-kiem/bai-hat?q=${encodeURIComponent(keywords)}`, // vanity search link
        author: v.author.name,
        duration: v.duration.seconds,
        cover: v.thumbnail,
      }));
      res.json({ videos });
    } catch (error: any) {
      console.error("[NCT Search Error]", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // 5. Search Autocomplete Suggestions (Google Suggest API proxy)
  app.get("/api/search/suggest", async (req, res) => {
    try {
      const keywords = req.query.q as string;
      if (!keywords) {
        return res.json([]);
      }
      const isYt = req.query.yt === "true";
      const url = `https://suggestqueries.google.com/complete/search?client=firefox&${isYt ? "ds=yt&" : ""}q=${encodeURIComponent(keywords)}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      const data = (await response.json()) as any;
      if (Array.isArray(data) && Array.isArray(data[1])) {
        return res.json(data[1]);
      }
      res.json([]);
    } catch (error: any) {
      console.error("[Suggest Error]", error.message);
      res.json([]);
    }
  });

  // Pixabay API endpoints
  app.get("/api/pixabay/search", async (req, res) => {
    try {
      const q = (req.query.q as string) || "rain";
      const p = (req.query.p as string) || "1";
      const pixabayUrl = `https://pixabay.com/sound-effects/search/${encodeURIComponent(q)}/?order=trending&pagi=${p}`;

      let html = "";
      let isFreesoundFallback = false;

      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(pixabayUrl)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();
        if (
          data &&
          data.contents &&
          data.contents.includes("window.__BOOTSTRAP__")
        ) {
          html = data.contents;
        }
      } catch (e) {
        console.warn("allorigins failed, falling back to freesound");
        isFreesoundFallback = true;
      }

      if (!html) {
        isFreesoundFallback = true;
      }

      if (isFreesoundFallback) {
        // Fallback to Freesound since Pixabay aggressively blocks proxies via Cloudflare
        const freeSoundUrl = `https://freesound.org/search/?q=${encodeURIComponent(q)}&page=${p}`;
        const fsRes = await fetch(freeSoundUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          },
        });
        const fsHtml = await fsRes.text();
        const $ = cheerio.load(fsHtml);
        const results: any[] = [];

        $(".bw-player").each((_, el) => {
          const mp3 = $(el).attr("data-mp3");
          const title = $(el).attr("data-title");
          const duration = parseFloat($(el).attr("data-duration") || "0");

          if (mp3 && title) {
            results.push({
              name: title.replace(".wav", "").replace(".mp3", ""),
              url: mp3,
              duration: duration,
              thumbnailUrl: "",
            });
          }
        });

        return res.json({ success: true, data: results.slice(0, 15) });
      }

      const match = html.match(/window\.__BOOTSTRAP__\s*=\s*(\{.*?\});/);

      if (!match) {
        return res.json({
          success: false,
          error: "Could not extract bootstrap data from Pixabay.",
        });
      }

      const bootstrap = JSON.parse(match[1]);

      const seenUrls = new Set<string>();
      function extractAudioFromJSON(obj: any): any[] {
        let results: any[] = [];
        if (!obj || typeof obj !== "object") return results;

        if (obj.mediaType === "audio" && obj.sources && obj.sources.src) {
          if (!seenUrls.has(obj.sources.src)) {
            seenUrls.add(obj.sources.src);
            results.push({
              name: obj.name || obj.alt || "Unknown",
              url: obj.sources.src,
              duration: obj.duration || 0,
              thumbnailUrl: obj.sources.thumbnailUrl || "",
            });
          }
        }

        for (const key of Object.keys(obj)) {
          if (typeof obj[key] === "object") {
            results = results.concat(extractAudioFromJSON(obj[key]));
          }
        }
        return results;
      }

      return res.json({
        success: true,
        data: extractAudioFromJSON(bootstrap).slice(0, 15),
      });
    } catch (error: any) {
      console.error("[Search Error]", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // TKaraoke API endpoints
  app.get("/api/tkaraoke/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const page = (req.query.p as string) || "1";
      if (!query)
        return res
          .status(400)
          .json({ success: false, error: "No query provided" });

      const url = `https://lyric.tkaraoke.com/s.tim?q=${encodeURIComponent(query)}&p=${page}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      const html = await response.text();
      const $ = cheerio.load(html);

      const songs: any[] = [];
      const seenUrls = new Set<string>();

      $("a").each((_, el) => {
        const href = $(el).attr("href") || "";
        if (href.match(/\/\d+\/[\w_]+\.html$/)) {
          const title = $(el).text().trim();
          const fullUrl = `https://lyric.tkaraoke.com${href}`;
          if (!seenUrls.has(fullUrl)) {
            seenUrls.add(fullUrl);
            songs.push({
              title: title,
              url: fullUrl,
            });
          }
        }
      });

      res.json({ success: true, videos: songs });
    } catch (error: any) {
      console.error("[TKaraoke Search Error]", error.message);
      res
        .status(500)
        .json({ success: false, error: "Failed to search TKaraoke." });
    }
  });

  app.get("/api/tkaraoke/playlist", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) return res.status(400).json({ error: "URL is required" });
      const songs = await fetchTKaraokePlaylist(url);
      res.json({ success: true, data: { songs } });
    } catch (error: any) {
      console.error("[TKaraoke Playlist Error]", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/tkaraoke/song", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) return res.status(400).json({ error: "URL is required" });
      const details = await fetchTKaraokeSongDetails(url);
      res.json({ success: true, data: details });
    } catch (error: any) {
      console.error("[TKaraoke Song Error]", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API to retrieve metadata of YouTube, Facebook, SoundCloud, etc.
  app.get("/api/metadata", async (req, res) => {
    try {
      let url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "URL parameter is required" });
      }
      url = await resolveFacebookRedirect(url);
      console.log(`[Metadata API] Resolving metadata for URL: ${url}`);
      
      // Handle NCT urls directly to avoid yt-dlp error
      if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
        try {
          const rawHtml = await fetchNctPlaylistWithProxyRace(url);
          const parsedData = parseNctHtml(rawHtml);
          if (parsedData.songs && parsedData.songs.length > 0) {
            const firstSong = parsedData.songs[0];
            return res.json({
              title: firstSong.title || "NhacCuaTui Track",
              cover: firstSong.cover || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300",
              author: firstSong.author || "Web Audio",
              duration: firstSong.duration || 0,
              url: firstSong.audioUrl || firstSong.originalUrl || url
            });
          }
        } catch (e: any) {
          console.warn("[Metadata API] NCT parser fallback failed:", e.message);
          return res.status(500).json({ error: "Failed to extract NhacCuaTui metadata" });
        }
      }


      const ytdlOptions: any = {
        dumpSingleJson: true,
        noWarnings: true,
        noPlaylist: true,
        f: "ba/bestaudio/b",
        jsRuntimes: "node",
        noCheckCertificates: true,
      };

      if (await hasYoutubeCookies()) {
        ytdlOptions.cookies = getCookiesFilePath();
      }

      const info = (await youtubedl(url, ytdlOptions)) as any;
      if (!info) {
        return res
          .status(400)
          .json({ error: "Could not extract metadata from URL" });
      }

      const responseData = {
        title: info.title || "Shared Audio Track",
        cover:
          info.thumbnail ||
          info.thumbnails?.[0]?.url ||
          "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300",
        author: info.uploader || info.artist || "Web Audio",
        duration: info.duration || 0,
      };

      res.json(responseData);
    } catch (error: any) {
      console.error("[Metadata API Error]", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to extract metadata" });
    }
  });

  // API to transcode stream to clean WAV for reliable decoding
  app.get("/api/clean-wav", async (req, res) => {
    try {
      let url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      url = await resolveFacebookRedirect(url);
      console.log(`[Clean WAV API] Transcoding to WAV: ${url}`);

      const ytDlpArgs = [
        "-f",
        "ba/bestaudio/b/best",
        "-o",
        "-",
        url,
      ];
      const subprocess = spawn(
        (youtubedl as any).constants.YOUTUBE_DL_PATH,
        ytDlpArgs,
      );

      const ffmpegArgs = [
        "-i",
        "pipe:0",
        "-f",
        "wav",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "44100",
        "-ac",
        "2",
        "pipe:1",
      ];
      const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

      subprocess.stdout.pipe(ffmpegProcess.stdin);

      res.setHeader("Content-Type", "audio/wav");
      ffmpegProcess.stdout.pipe(res);

      subprocess.on("error", (err) =>
        console.error("[Clean WAV] yt-dlp error:", err),
      );
      ffmpegProcess.on("error", (err) =>
        console.error("[Clean WAV] ffmpeg error:", err),
      );
    } catch (err: any) {
      console.error("[Clean WAV API Error]", err);
      res.status(500).json({ error: err.message || "Failed to transcode" });
    }
  });

  // API to download and proxy audio files from url with proper content type and attachment headers
  app.get("/api/download", async (req, res) => {
    try {
      const url = req.query.url as string;
      const title = (req.query.title as string) || "audio";
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      console.log(`[Download API] Downloading and proxying: ${url}`);

      const headers: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };

      if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
        headers["Referer"] = "https://www.nhaccuatui.com/";
        headers["Origin"] = "https://www.nhaccuatui.com";
      }
      if (url.includes("tiktokcdn") || url.includes("tiktok.com")) {
        headers["Referer"] = "https://www.tiktok.com/";
      }

      let finalUrl = url;
      if (url.includes("/api/proxy-stream?url=")) {
        const urlParams = new URLSearchParams(url.split("?")[1]);
        finalUrl = urlParams.get("url") || url;
      } else if (url.includes("/api/stream?url=")) {
        const urlParams = new URLSearchParams(url.split("?")[1]);
        finalUrl = urlParams.get("url") || url;
      }

      if (!finalUrl.startsWith("http")) {
        finalUrl = `http://localhost:3000${finalUrl}`;
      }

      let safeTitle = title.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim();
      if (safeTitle.length > 80) safeTitle = safeTitle.substring(0, 80).trim();
      if (!safeTitle) safeTitle = "audio";

      const isDirect =
        finalUrl.toLowerCase().includes(".mp3") ||
        finalUrl.toLowerCase().includes(".m4a") ||
        finalUrl.toLowerCase().includes(".flac") ||
        finalUrl.toLowerCase().includes(".wav");

      let response: any = null;

      if (!isDirect && (finalUrl.includes("youtube.com") || finalUrl.includes("youtu.be") || finalUrl.includes("facebook.com") || finalUrl.includes("fb.watch") || finalUrl.includes("nhaccuatui.com") || finalUrl.includes("nct.vn") || finalUrl.includes("tkaraoke.com"))) {
          try {
            finalUrl = await getDirectMediaUrl(finalUrl, req.query.force_refresh === "true");
          } catch(e) { }
      }

      // If it's a tiktok page URL (not CDN), don't fetch directly because it returns HTML
      const isTikTokPage = finalUrl.includes("tiktok.com") && !finalUrl.includes("tiktokcdn");

      if (!isTikTokPage) {
        try {
          response = await fetch(finalUrl, { headers });
          if (!response.ok || response.headers.get("content-type")?.includes("text/html")) {
            console.warn(`[Download API] Direct fetch failed or returned HTML: ${response?.status}, falling back to yt-dlp...`);
            response = null;
          }
        } catch (err) {
          console.warn("[Download API] Direct fetch threw error, falling back to yt-dlp...");
        }
      }

      if (!response) {
        // Fallback to yt-dlp
        const ytDlpArgs = [
          "-f",
          "ba/bestaudio/b/best",
          "-o",
          "-",
          url, // USE THE ORIGINAL URL for yt-dlp
        ];
        const subprocess = spawn(
          (youtubedl as any).constants.YOUTUBE_DL_PATH,
          ytDlpArgs,
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="audio.m4a"; filename*=UTF-8''${encodeURIComponent(safeTitle)}.m4a`
        );
        res.setHeader("Content-Type", "audio/mp4");
        res.setHeader("Transfer-Encoding", "chunked");
        if (subprocess.stdout) {
          subprocess.stdout.pipe(res);
        } else {
          res.status(500).json({ error: "Failed to create audio stream via yt-dlp" });
        }
        return;
      }

      let contentType = response.headers.get("content-type") || "audio/mpeg";
      let extension = "mp3";
      if (contentType.includes("mp4")) extension = "mp4";
      if (contentType.includes("wav")) extension = "wav";
      if (contentType.includes("flac")) extension = "flac";
      if (contentType.includes("m4a") || contentType.includes("aac")) extension = "m4a";
      if (contentType.includes("webm") || contentType.includes("opus")) extension = "webm";

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="audio.${extension}"; filename*=UTF-8''${encodeURIComponent(safeTitle)}.${extension}`
      );
      res.setHeader("Content-Type", contentType);

      const contentLength = response.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);

      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.pipe(res);
        res.on("close", () => nodeStream.destroy());
      } else {
        res.status(500).json({ error: "Failed to download stream" });
      }
    } catch (error: any) {
      console.error("[Download API Error]", error);
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/lyric/format", express.json(), async (req, res) => {
    try {
      const { lyric, style } = req.body;
      if (!lyric) {
        return res.status(400).json({ error: "lyric is required" });
      }
      const result = await formatLyric(lyric, style);
      res.json(result);
    } catch (error: any) {
      console.error("[Lyric Format Error]", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/lyric/improve", express.json(), async (req, res) => {
    try {
      const { lyric, percentage = 3 } = req.body;
      if (!lyric) {
        return res.status(400).json({ error: "lyric is required" });
      }
      const result = await improveLyric(lyric, percentage);
      res.json(result);
    } catch (error: any) {
      console.error("[Lyric Improve Error]", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/lyric/chords", express.json(), async (req, res) => {
    try {
      const { lyric } = req.body;
      if (!lyric) {
        return res.status(400).json({ error: "lyric is required" });
      }
      const result = await addChordsLyric(lyric);
      res.json(result);
    } catch (error: any) {
      console.error("[Lyric Chords Error]", error);
      res.status(500).json({ error: error.message });
    }
  });

  
  app.post("/api/lyric/arrange", express.json(), async (req, res) => {
    try {
      const { lyric, options } = req.body;
      if (!lyric) {
        return res.status(400).json({ error: "lyric is required" });
      }
      const result = await arrangeLyric(lyric, options || {});
      res.json(result);
    } catch (error: any) {
      console.error("[Lyric Arrange Error]", error);
      res.status(500).json({ error: error.message });
    }
  });

  
  app.post("/api/lyric/suggest", express.json(), async (req, res) => {
    try {
      const { selectedText, instruction } = req.body;
      if (!selectedText) {
        return res.status(400).json({ error: "selectedText is required" });
      }
      
      
      const result = await suggestLyricTags(selectedText, instruction || "");
      res.json(result);
    } catch (error: any) {
      console.error("[Lyric Suggest Error]", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/lyric/bypass", express.json(), async (req, res) => {
    try {
      const { lyric } = req.body;
      if (!lyric) {
        return res.status(400).json({ error: "lyric is required" });
      }
      const result = await bypassLyric(lyric);
      res.json(result);
    } catch (error: any) {
      console.error("[Lyric Bypass Error]", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/gdrive/files", async (req, res) => {
    try {
      const { folderId } = req.query;
      if (!folderId) {
        return res.status(400).json({ error: "folderId is required" });
      }
      const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
      if (!apiKey) {
        return res
          .status(500)
          .json({
            error: "GOOGLE_DRIVE_API_KEY is not configured on the server.",
          });
      }
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,size)&key=${apiKey}&pageSize=1000`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Drive API responded with ${response.status}: ${errorText}`,
        );
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("[Drive API Error]", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to fetch Drive folder" });
    }
  }); 
  app.get("/api/gdrive/stream", async (req, res) => {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "id is required" });
      }

      const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GOOGLE_DRIVE_API_KEY is not configured on the server." });
      }

      const url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${apiKey}`;
      const headers = {};
      if (req.headers.range) {
        headers["Range"] = req.headers.range;
      }
      
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Drive API responded with ${response.status}: ${errorText}`);
      }

      res.status(response.status);
      
      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      
      const contentLength = response.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);
      
      const contentRange = response.headers.get("content-range");
      if (contentRange) res.setHeader("Content-Range", contentRange);
      
      res.setHeader("Accept-Ranges", response.headers.get("accept-ranges") || "bytes");

      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.pipe(res);
        res.on("close", () => nodeStream.destroy());
      } else {
        res.end();
      }
    } catch (error: any) {
      console.error("[Drive API Stream Error]", error);
      res.status(500).json({ error: error.message || "Failed to stream Drive file" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
});
