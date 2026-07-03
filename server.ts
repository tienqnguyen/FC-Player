import express from "express";
import { createServer as createViteServer } from "vite";
import youtubedl from "youtube-dl-exec";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { Readable } from "stream";
import { spawn } from "child_process";
import ytSearch from "yt-search";
import axios from "axios";
import { fetchNctPlaylistWithProxyRace, parseNctHtml } from "./server/nctParser";
import { hasYoutubeCookies, getCookiesFilePath, saveYoutubeCookies, getYoutubeCookiesStatus } from "./server/youtubeCookieHelper";
import { getCachedData, setCachedData, invalidateCache } from "./server/cacheHelper";

async function resolveFacebookRedirect(url: string): Promise<string> {
  const isFb = url.includes("facebook.com") || url.includes("fb.watch");
  if (!isFb) return url;

  try {
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow"
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

const directStreamMemoryCache = new Map<string, { url: string; expiresAt: number }>();
const directStreamInFlightPromises = new Map<string, Promise<string>>();

async function getDirectMediaUrl(url: string): Promise<string> {
  const now = Date.now();
  const cached = directStreamMemoryCache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  let inFlightPromise = directStreamInFlightPromises.get(url);
  if (!inFlightPromise) {
    inFlightPromise = (async () => {
      try {
        const ytdlOptions: any = {
          dumpSingleJson: true,
          noWarnings: true,
          noPlaylist: true,
          f: "ba[ext=m4a]/b[ext=mp4]/ba/b/best",
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
          expiresAt: Date.now() + (2 * 60 * 60 * 1000) // cache for 2 hours
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

  // API to stream audio of YouTube, Facebook, SoundCloud, etc.
  app.get("/api/stream", async (req, res) => {
    try {
      let url = req.query.url as string;
      if (!url) {
        res.status(400).json({ error: "Invalid stream URL" });
        return;
      }

      url = await resolveFacebookRedirect(url);

      // Attempt high-performance Range-proxying using direct CDN URL extraction
      try {
        const directUrl = await getDirectMediaUrl(url);
        console.log(`[Stream Range Proxy] Streaming direct URL: ${directUrl.substring(0, 80)}...`);

        const headers: Record<string, string> = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        };

        if (req.headers.range) {
          headers["Range"] = req.headers.range;
        }

        const response = await fetch(directUrl, { headers });

        if (response.status !== 200 && response.status !== 206) {
          console.warn(`[Stream Range Proxy] Upstream returned non-success status ${response.status} for URL. Evicting cache.`);
          directStreamMemoryCache.delete(url);
          throw new Error(`Upstream returned non-success status: ${response.status}`);
        }

        res.status(response.status);

        let contentType = response.headers.get("content-type");
        if (contentType) {
          // Normalize video/mp4 (e.g. from Facebook) to audio/mp4 so mobile browsers and HTML5 <audio> handle it reliably
          if (contentType.startsWith("video/")) {
            contentType = contentType.replace("video/", "audio/");
          }
          res.setHeader("Content-Type", contentType);
        } else {
          res.setHeader("Content-Type", "audio/mp4");
        }

        const contentLength = response.headers.get("content-length");
        if (contentLength) res.setHeader("Content-Length", contentLength);

        const contentRange = response.headers.get("content-range");
        if (contentRange) res.setHeader("Content-Range", contentRange);

        const acceptRanges = response.headers.get("accept-ranges");
        if (acceptRanges) {
          res.setHeader("Accept-Ranges", acceptRanges);
        } else {
          res.setHeader("Accept-Ranges", "bytes");
        }

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");

        if (response.body) {
          const nodeStream = Readable.fromWeb(response.body as any);
          nodeStream.pipe(res);
          res.on("close", () => {
            nodeStream.destroy();
          });
          return;
        }
      } catch (proxyError: any) {
        console.warn(`[Stream Range Proxy] Failed to extract/stream direct URL, falling back to live spawned pipeline:`, proxyError.message || proxyError);
      }

      // FALLBACK: Spawned live yt-dlp pipeline (No native Range support, but streams directly)
      res.header("Content-Type", "audio/mp4");
      res.header("Accept-Ranges", "bytes");
      res.header(
        "Content-Disposition",
        `inline; filename="audio.m4a"`,
      );

      const ytdlOptions: any = {
        o: "-",
        f: "ba[ext=m4a]/b[ext=mp4]/ba/b/best",
        noPlaylist: true,
        jsRuntimes: "node",
        noCheckCertificates: true,
      };
      
      if (await hasYoutubeCookies()) {
        ytdlOptions.cookies = getCookiesFilePath();
      }

      const subprocess = youtubedl.exec(url, ytdlOptions, { stdio: ["ignore", "pipe", "ignore"] });

      subprocess.catch((err: any) => {
        console.error("yt-dlp child process error:", err.stderr || err.message);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });

      if (subprocess.stdout) {
        subprocess.stdout.pipe(res);
      } else {
        res.status(500).json({ error: "Failed to create audio stream" });
      }
    } catch (error: any) {
      console.error(error);
      res
        .status(500)
        .json({ error: error.message || "Failed to stream media URL" });
    }
  });

  // API to get general metadata (supported sites: YouTube, Facebook, SoundCloud, Twitter, etc.)
  app.get("/api/metadata", async (req, res) => {
    try {
      let url = req.query.url as string;
      if (!url) {
        res.status(400).json({ error: "Invalid URL" });
        return;
      }
      
      url = await resolveFacebookRedirect(url);
      
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

      const info = (await youtubedl(url, ytdlOptions)) as any;
      
      res.json({ 
        title: info.title || "Shared Audio Track",
        cover: info.thumbnail || info.thumbnails?.[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300",
        author: info.uploader || info.artist || "Web Audio",
        duration: info.duration || 180
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // API to proxy and download audio as attachment
  app.get("/api/download", async (req, res) => {
    try {
      let url = req.query.url as string;
      const title = (req.query.title as string) || "audio";
      
      if (!url) {
        res.status(400).json({ error: "Invalid URL" });
        return;
      }

      url = await resolveFacebookRedirect(url);

      res.header("Content-Type", "audio/mp4");
      res.header(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(title)}.m4a"`
      );

      // If it's a YouTube / Facebook / SoundCloud etc. URL, we use youtubedl
      const isDirectTikTokAudio = url.includes("tikwm.com") || url.includes("tiktokcdn") || url.includes("tiktok.com");
      const isNctAudio = url.includes("nct.vn") || url.includes("nhaccuatui.com");
      
      if (!isDirectTikTokAudio && !isNctAudio && (url.includes("://") || url.startsWith("http"))) {
        const ytdlOptions: any = {
          o: "-",
          f: "ba[ext=m4a]/b[ext=mp4]/ba/b/best",
          jsRuntimes: "node",
          noCheckCertificates: true,
        };
        
        if (await hasYoutubeCookies()) {
          ytdlOptions.cookies = getCookiesFilePath();
        }

        const subprocess = youtubedl.exec(url, ytdlOptions, { stdio: ["ignore", "pipe", "ignore"] });

        subprocess.catch((err: any) => {
          console.error("yt-dlp child process error:", err.stderr || err.message);
          if (!res.headersSent) {
            res.status(500).end();
          }
        });

        if (subprocess.stdout) {
          subprocess.stdout.pipe(res);
        } else {
          res.status(500).json({ error: "Failed to create audio stream" });
        }
      } else {
        // Otherwise, it's a direct url (like tiktok audio), fetch and pipe it
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch audio from source");
        if (response.body) {
          // fetch API stream to node stream compatibility
          const reader = response.body.getReader();
          const pumper = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
            res.end();
          };
          pumper().catch(err => {
            console.error(err);
            if (!res.writableEnded) res.end();
          });
        } else {
          res.status(500).json({ error: "No body in audio response" });
        }
      }
    } catch (error: any) {
      console.error(error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Failed to download audio" });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  });

  // API to proxy and stream direct audio URLs (bypassing CORS & Geo-blocking) with range support

  app.get("/api/proxy-stream", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.nhaccuatui.com/",
        "Origin": "https://www.nhaccuatui.com"
      };

      // Support Range requests from the browser audio tag (necessary for seek & buffer in Chrome/Safari)
      if (req.headers.range) {
        headers["Range"] = req.headers.range;
      }

      console.log(`[Proxy Stream] Fetching direct stream from source: ${url.substring(0, 80)}...`);
      const response = await fetch(url, { headers });

      // Forward headers from upstream to client
      res.status(response.status);
      
      let contentType = response.headers.get("content-type");
      if (url.toLowerCase().includes(".flac")) {
        contentType = "audio/flac";
      }
      if (contentType) res.setHeader("Content-Type", contentType);
      
      const contentLength = response.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);
      
      const contentRange = response.headers.get("content-range");
      if (contentRange) res.setHeader("Content-Range", contentRange);

      const acceptRanges = response.headers.get("accept-ranges");
      if (acceptRanges) {
        res.setHeader("Accept-Ranges", acceptRanges);
      } else {
        res.setHeader("Accept-Ranges", "bytes");
      }

      // Add CORS headers so Web Audio API & audio components can decode natively
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");

      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.pipe(res);
        res.on("close", () => {
          nodeStream.destroy();
        });
      } else {
        res.status(500).json({ error: "No body in audio stream source." });
      }
    } catch (error: any) {
      console.error("[Proxy Stream Error]", error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Failed to proxy stream." });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  });

  // API to separate stems using Gradio space
  app.post("/api/stemmix", async (req, res) => {
    try {
      const { audioUrl } = req.body;
      if (!audioUrl) {
        return res.status(400).json({ error: "No audio URL provided" });
      }

      console.log(`[Stemmix] Separating stems for: ${audioUrl}`);
      
      // We must fetch the audio ourselves to bypass any CORS/Referer blocks 
      // and provide it directly as a Blob to the HF space.
      let targetUrl = audioUrl;
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };

      if (targetUrl.includes("/api/proxy-stream?url=")) {
        targetUrl = decodeURIComponent(targetUrl.split("url=")[1]);
        headers["Referer"] = "https://www.nhaccuatui.com/";
        headers["Origin"] = "https://www.nhaccuatui.com";
      }

      console.log(`[Stemmix] Fetching audio from: ${targetUrl}`);
      const audioResponse = await fetch(targetUrl, { headers });
      if (!audioResponse.ok) {
         throw new Error(`Failed to fetch audio for Stemmix. Status: ${audioResponse.status}`);
      }
      
      const arrayBuffer = await audioResponse.arrayBuffer();
      const blob = new Blob([arrayBuffer]);
      console.log(`[Stemmix] Downloaded audio blob: ${blob.size} bytes. Initiating HF separation...`);

      // Import dynamically to avoid top-level issues if gradio is not installed yet
      const { client, handle_file } = await import("@gradio/client");

      let hfApp;
      let result;
      let success = false;
      let errorMsg = "";

      // Sequential candidate spaces to try for AI separation
      const spaces = ["PeachJed/Stemmix", "tienqnguyen95/Stemmix", "sociallyclever/demucs"];

      for (const space of spaces) {
        try {
          console.log(`[Stemmix] Attempting to load Hugging Face Space: ${space}`);
          hfApp = await client(space);
          result = await hfApp.predict("/separate_stems", {
            audio_file: handle_file(blob),
          }) as any;
          
          if (result && result.data) {
            success = true;
            console.log(`[Stemmix] Successfully separated stems using Space: ${space}`);
            break;
          }
        } catch (e: any) {
          console.warn(`[Stemmix] Failed using Space ${space}:`, e.message);
          errorMsg = e.message || String(e);
        }
      }

      if (success && result && result.data) {
        // result.data contains:
        // 0: { visible: true, __type__: "update" }
        // 1: status string
        // 2: drums
        // 3: bass
        // 4: other
        // 5: vocals
        // 6: guitar
        // 7: piano
        const stems = {
            drums: result.data[2]?.url || null,
            bass: result.data[3]?.url || null,
            other: result.data[4]?.url || null,
            vocals: result.data[5]?.url || null,
            guitar: result.data[6]?.url || null,
            piano: result.data[7]?.url || null,
            isDspFallback: false
        };
        return res.json({ success: true, stems });
      }

      // If all HF Spaces are unavailable, gracefully fall back to local Acoustic DSP separation
      console.log(`[Stemmix] AI separation spaces failed. Activating high-fidelity Local Acoustic DSP Fallback.`);
      const stems = {
          drums: audioUrl,
          bass: audioUrl,
          other: audioUrl,
          vocals: audioUrl,
          guitar: audioUrl,
          piano: audioUrl,
          isDspFallback: true
      };
      
      return res.json({ 
        success: true, 
        stems, 
        isDspFallback: true,
        message: "AI Cloud servers are currently offline. Running in high-fidelity local Acoustic DSP mode."
      });

    } catch (error: any) {
      console.error("[Stemmix Error]", error);
      // Extra safety: Return fallback instead of failing completely
      try {
        const { audioUrl } = req.body;
        if (audioUrl) {
          const stems = {
              drums: audioUrl,
              bass: audioUrl,
              other: audioUrl,
              vocals: audioUrl,
              guitar: audioUrl,
              piano: audioUrl,
              isDspFallback: true
          };
          return res.json({ 
            success: true, 
            stems, 
            isDspFallback: true,
            message: "AI Cloud servers are offline. Running in high-fidelity local Acoustic DSP mode."
          });
        }
      } catch (e) {}
      res.status(500).json({ error: error.message || "Failed to separate stems" });
    }
  });

  // API to fetch and parse NhacCuaTui playlist via fast proxy racing to bypass region lock
  app.get("/api/nhaccuatui/playlist", async (req, res) => {
    try {
      const playlistUrl = req.query.url as string;
      const forceRefresh = req.query.refresh === 'true';

      if (!playlistUrl) {
        return res.status(400).json({ error: "NhacCuaTui playlist URL is required." });
      }

      if (forceRefresh) {
        await invalidateCache("nct_playlist", playlistUrl);
      } else {
        const cached = await getCachedData<any>("nct_playlist", playlistUrl);
        if (cached) {
          console.log(`[API] Serving CACHED NhacCuaTui playlist: ${playlistUrl}`);
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
        data: parsedData
      });
    } catch (error: any) {
      console.error("[API NCT Error]", error.message);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to retrieve NhacCuaTui playlist details. The service might be temporarily geoblocked or overloaded."
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
        data: parsedData
      });
    } catch (error: any) {
      console.error("[API NCT Manual Error]", error.message);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to parse NhacCuaTui page source HTML. Make sure you copied the correct source."
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
      
      if (!songsToSave || !Array.isArray(songsToSave) || songsToSave.length === 0) {
        return res.status(400).json({ error: "Song list is empty or invalid. Make sure the playlist contains tracks." });
      }
      
      const configPath = path.join(process.cwd(), "default_playlist_config.json");
      await fs.writeFile(configPath, JSON.stringify(songsToSave, null, 2), "utf8");
      
      console.log(`[API] Default playlist updated with ${songsToSave.length} songs and saved to file.`);
      res.json({ success: true, message: "Playlist successfully set as default!", songs: songsToSave });
    } catch (error: any) {
      console.error("[API NCT Save Default Error]", error.message);
      res.status(500).json({ success: false, error: error.message || "Failed to save playlist as default." });
    }
  });

  // API to retrieve the set default songs list
  app.get("/api/default-songs", async (req, res) => {
    try {
      const configPath = path.join(process.cwd(), "default_playlist_config.json");
      if (existsSync(configPath)) {
        const content = await fs.readFile(configPath, "utf8");
        const songs = JSON.parse(content);
        return res.json({ success: true, songs });
      }
      res.json({ success: true, songs: [] });
    } catch (error: any) {
      console.error("[API Get Default Songs Error]", error.message);
      res.status(500).json({ success: false, error: error.message || "Failed to retrieve default songs.", songs: [] });
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
            cover: "https://image-cdn.nct.vn/song/2026/05/21/t/a/x/v/1779370796566.jpg",
            duration: 296,
            audioUrl: "/api/proxy-stream?url=https%3A%2F%2Fstream.nct.vn%2Fresa%2F2605%2Fa4%2F52%2F96myxlw2bg.mp3%3Fst%3DG5iXoDQWnWgHmtXbfr2ucQ%26e%3D1781276871%26a%3D6%26p%3D0%26r%3D885ad4649ef1d80dd7233f228343a253",
            originalUrl: "https://www.nhaccuatui.com/song/xLLyzXlyrRLa.html",
            sharedBy: "Acoustic System",
            sharedAt: new Date().toISOString(),
            likes: 15
          },
          {
            id: "comm_seed2",
            title: "Lofi Hip Hop Radio 📚 Beats to Study/Relax to",
            author: "Lofi Girl",
            cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300",
            duration: 3600,
            audioUrl: "/api/stream?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DjfKfPfyJRdk",
            originalUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
            sharedBy: "Lofi Team",
            sharedAt: new Date().toISOString(),
            likes: 24
          }
        ];
        await fs.writeFile(dbPath, JSON.stringify(tracks, null, 2), "utf-8");
      } else {
        const content = await fs.readFile(dbPath, "utf-8");
        tracks = JSON.parse(content);
      }

      res.json({ success: true, tracks });
    } catch (error: any) {
      console.error("[API GET Tracks Error]", error.message);
      res.status(500).json({ success: false, error: error.message || "Failed to retrieve community tracks.", tracks: [] });
    }
  });

  // POST share community track
  app.post("/api/community/share", async (req, res) => {
    try {
      let { url, title, author, cover, duration, sharedBy } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ success: false, error: "Valid URL is required." });
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
            console.warn("[Community Share] Fallback NCT parsing issue:", e.message);
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
            console.warn("[Community Share] Fallback yt-dlp metadata issue:", e.message);
          }
        }
      }

      // Default fallbacks in case both parsing and direct values are missing
      title = title || "Shared Web Clip";
      author = author || "Acoustic Community";
      cover = cover || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300";
      duration = duration || 180;

      // Unify stream routes cleanly
      let audioUrl = "";
      if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
        audioUrl = `/api/proxy-stream?url=${encodeURIComponent(url)}`;
      } else {
        audioUrl = `/api/stream?url=${encodeURIComponent(url)}`;
      }

      const songObj = {
        id: "comm_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now(),
        title,
        author,
        cover,
        duration,
        audioUrl,
        originalUrl: url,
        sharedBy,
        sharedAt: new Date().toISOString(),
        likes: 0
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
      const existingIndex = tracks.findIndex(t => t.originalUrl === url);
      if (existingIndex !== -1) {
        // Update contributor or bump shared time
        tracks[existingIndex] = {
          ...tracks[existingIndex],
          title: songObj.title,
          author: songObj.author,
          cover: songObj.cover,
          sharedBy: songObj.sharedBy,
          sharedAt: songObj.sharedAt
        };
      } else {
        tracks.unshift(songObj);
      }

      await fs.writeFile(dbPath, JSON.stringify(tracks, null, 2), "utf-8");
      res.json({ success: true, track: songObj });
    } catch (error: any) {
      console.error("[API Community Share Error]", error.message);
      res.status(500).json({ success: false, error: error.message || "Failed to share track to community." });
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
      res.json({ success: true, message: loaded ? "Cookies saved and parsed successfully!" : "Cookies cleared.", status });
    } catch (error: any) {
      console.error("[API Cookies Error]", error.message);
      res.status(500).json({ success: false, error: error.message || "Failed to save cookies" });
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
      const forceRefresh = req.query.refresh === 'true';
      
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
          const params = new URLSearchParams({ unique_id, count: clientCount, cursor: clientCursor });
          const response = await fetch("https://www.tikwm.com/api/user/posts", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString()
          });
          const text = await response.text();
          const data = JSON.parse(text);
          if (data.code === 0 && data.data?.videos?.length > 0) {
            return {
              videos: data.data.videos,
              cursor: (data.data.cursor || "").toString(),
              hasMore: !!data.data.hasMore
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
            const params = new URLSearchParams({ keywords: `@${unique_id}`, count: "30", cursor: currentCursor });
            const response = await fetch("https://www.tikwm.com/api/feed/search", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: params.toString()
            });
            const text = await response.text();
            let data;
            try { data = JSON.parse(text); } catch (e) { break; }
            
            if (data.code === 0 && data.data?.videos?.length > 0) {
              const filtered = data.data.videos.filter((v: any) => 
                 v.author?.unique_id?.toLowerCase() === unique_id.toLowerCase()
              );
              
              const currentIds = new Set(allVideos.map(v => v.video_id || v.id));
              const newVideos = filtered.filter((v: any) => !currentIds.has(v.video_id || v.id));
              allVideos.push(...newVideos);
              
              currentCursor = (data.data.cursor || 0).toString();
              hasMoreResult = !!data.data.hasMore;
              if (allVideos.length >= parseInt(clientCount) || !data.data.hasMore) {
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
              hasMore: hasMoreResult
            };
          }
          throw new Error("TikWM search fallback failed");
        },
        // Strategy 3: HTML fetch + proxy via AllOrigins
        async () => {
           const targetUrl = `https://www.tiktok.com/@${unique_id}`;
           const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
           const response = await fetch(proxyUrl);
           const data = await response.json();
           const html = data.contents;
           if (typeof html !== 'string') throw new Error("Html proxy failed");
           
           const match = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)<\/script>/);
           if (match) {
             const parsed = JSON.parse(match[1]);
             const itemList = parsed?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.itemList;
             if (itemList && Array.isArray(itemList) && itemList.length > 0) {
                return {
                  videos: itemList,
                  cursor: "0",
                  hasMore: false
                };
             }
           }
           throw new Error("HTML fetch scraping failed or returned 0 items");
        }
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
                hasMore: result.hasMore 
              } 
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
        error: "Failed to extract user posts. Cloudflare/Captcha blocked all scraping strategies (Direct API, Proxy, and HTML Fetch).",
        isCloudflareBlock: true
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
      const r = await Promise.race([
        ytSearch(keywords),
        new Promise((_, reject) => setTimeout(() => reject(new Error("YouTube search timeout")), 8000))
      ]) as any;
      
      const videos = r.videos.slice(0, 30).map((v: any) => ({
         id: v.videoId,
         title: v.title,
         url: v.url,
         author: v.author.name,
         duration: v.duration.seconds,
         cover: v.thumbnail
      }));
      
      res.json({ videos });
    } catch (error: any) {
      console.error("[YouTube Search Error]", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. TikTok Search (via Tikwm API)
  app.get("/api/tiktok/search", async (req, res) => {
    try {
      const keywords = req.query.q as string;
      const clientCursor = (req.query.cursor as string) || "0";
      const clientCount = (req.query.count as string) || "30";
      const searchType = (req.query.type as string) || "video"; // "video" or "sound"
      
      if (!keywords) {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      // Tikwm mapping: type 1 = video, type 'music' = sound
      const params = new URLSearchParams({ 
        keywords, 
        count: clientCount, 
        cursor: clientCursor, 
        type: searchType === "sound" ? "music" : "1" 
      });
      
      const response = await fetch("https://www.tikwm.com/api/feed/search", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
      });
      
      const text = await response.text();
      const data = JSON.parse(text);
      
      if (data.code === 0 && data.data?.videos?.length > 0) {
        return res.json({
          videos: data.data.videos,
          cursor: (data.data.cursor || "").toString(),
          hasMore: !!data.data.hasMore
        });
      }
      return res.json({ videos: [], cursor: "0", hasMore: false });
    } catch (error: any) {
      console.error("[Search Error]", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Real NCT (Nhaccuatui) Proxy Search 
  app.get('/api/nct-search', async (req, res) => {
    try {
      const { q, pageindex = 1, pagesize = 50 } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Query 'q' is required" });
      }
      
      const url = `https://graph.nhaccuatui.com/api/v1/search/song?keyword=${encodeURIComponent(q)}&pageindex=${pageindex}&pagesize=${pagesize}&correct=false&timestamp=${Date.now()}`;
            
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        }
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
            if (st.type === "320") score = 3; // 320kbps is best playable
            else if (st.type === "128") score = 2; 
            else if (st.type === "lossless") score = 1; // Demote FLAC to lowest priority (usually VIP/fails)
                        
            if (score > bestScore) {
              bestScore = score;
              bestStreamUrl = st.stream;
              qualityLabel = st.typeUI || (st.type === "lossless" ? "LOSSLESS" : `${st.type}kbps`);
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
          quality: qualityLabel
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
      const r = await Promise.race([
        ytSearch(`${keywords} nhaccuatui`),
        new Promise((_, reject) => setTimeout(() => reject(new Error("YouTube search timeout (NCT fallback)")), 8000))
      ]) as any;
      
      const videos = r.videos.slice(0, 30).map((v: any) => ({
         id: "nct_" + v.videoId,
         title: v.title.replace(/nhaccuatui/ig, '').trim() || v.title,
         url: v.url, // Keep as youtube URL so the audio streamer yt-dlp can play it!
         nctLink: `https://www.nhaccuatui.com/tim-kiem/bai-hat?q=${encodeURIComponent(keywords)}`, // vanity search link
         author: v.author.name,
         duration: v.duration.seconds,
         cover: v.thumbnail
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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      
      const data = await response.json() as any;
      if (Array.isArray(data) && Array.isArray(data[1])) {
        return res.json(data[1]);
      }
      res.json([]);
    } catch (error: any) {
      console.error("[Suggest Error]", error.message);
      res.json([]);
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
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
