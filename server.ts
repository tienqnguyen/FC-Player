import express from "express";
import { createServer as createViteServer } from "vite";
import youtubedl from "youtube-dl-exec";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { Readable } from "stream";
import { spawn } from "child_process";
import ytSearch from "yt-search";
import axios from "axios";
import { fetchNctPlaylistWithProxyRace, parseNctHtml } from "./server/nctParser";
import { fetchTKaraokePlaylist, fetchTKaraokeSongDetails } from "./server/tkaraokeParser";
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
      
      try {
        const directUrl = await getDirectMediaUrl(url);
        console.log(`[Stream Range Proxy] Streaming direct URL: ${directUrl.substring(0, 80)}...`);
        const headers: Record<string, string> = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        };
        if (req.headers.range) headers["Range"] = req.headers.range;
        const response = await fetch(directUrl, { headers });
        res.status(response.status);
        let contentType = response.headers.get("content-type");
        if (contentType) res.setHeader("Content-Type", contentType);
        const contentLength = response.headers.get("content-length");
        if (contentLength) res.setHeader("Content-Length", contentLength);
        const contentRange = response.headers.get("content-range");
        if (contentRange) res.setHeader("Content-Range", contentRange);
        res.setHeader("Accept-Ranges", response.headers.get("accept-ranges") || "bytes");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
        if (response.body) {
            const nodeStream = Readable.fromWeb(response.body as any);
            nodeStream.pipe(res);
            res.on("close", () => nodeStream.destroy());
            return;
        }
      } catch(err) {
         console.warn("[Stream Proxy] direct url failed, falling back to yt-dlp");
      }

      const ytDlpArgs = ["-f", "bestaudio", "-o", "-", url];
      const subprocess = spawn("yt-dlp", ytDlpArgs);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Transfer-Encoding", "chunked");
      if (subprocess.stdout) {
          subprocess.stdout.pipe(res);
      } else {
          res.status(500).json({ error: "Failed to create audio stream" });
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      };
      if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
        headers["Referer"] = "https://www.nhaccuatui.com/";
        headers["Origin"] = "https://www.nhaccuatui.com";
      }
      if (req.headers.range) {
        headers["Range"] = req.headers.range;
      }
      const response = await fetch(url, { headers });
      if (!response.ok) {
        console.error(`[Proxy Stream] HTTP error fetching ${url}: ${response.status} ${response.statusText}`);
      }
      res.status(response.status);
      let contentType = response.headers.get("content-type");
      if (url.toLowerCase().includes(".flac")) contentType = "audio/flac";
      if (contentType) res.setHeader("Content-Type", contentType);
      const contentLength = response.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);
      const contentRange = response.headers.get("content-range");
      if (contentRange) res.setHeader("Content-Range", contentRange);
      res.setHeader("Accept-Ranges", response.headers.get("accept-ranges") || "bytes");
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
      console.error(`[Proxy Stream] Exception fetching ${req.query.url}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Failed to proxy stream." });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  });

  const upload = multer({ storage: multer.memoryStorage() });
  app.post("/api/stemmix", upload.single('audio_file'), async (req, res) => {
    try {
      let audioUrl = req.body.audioUrl;
      let targetUrl = audioUrl;
      let blob;

      if (req.file) {
        // Uploaded file
        blob = new Blob([req.file.buffer]);
        console.log(`[Stemmix] Received uploaded file: ${req.file.originalname} (${blob.size} bytes)`);
        targetUrl = "uploaded_file";
      } else {
        if (!audioUrl) {
          return res.status(400).json({ error: "No audio URL or file provided" });
        }
        if (targetUrl && targetUrl.startsWith("blob:")) {
          return res.status(400).json({ error: "Cannot process browser local blob URLs on the server. Please ensure the local file is uploaded." });
        }
        console.log(`[Stemmix] Separating stems for: ${audioUrl}`);
        
        const headers = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
           throw new Error(`Failed to fetch audio for Stemmix. Status: ${audioResponse.status}`);
        }
        const arrayBuffer = await audioResponse.arrayBuffer();
        blob = new Blob([arrayBuffer]);
        console.log(`[Stemmix] Downloaded audio blob: ${blob.size} bytes. Initiating HF separation...`);
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
        "fabiocarrilho/demucs"
      ];
      const customSpace = req.body.customSpace;
      if (customSpace && typeof customSpace === "string" && customSpace.trim()) {
        const cleaned = customSpace.trim();
        if (!spaces.includes(cleaned)) {
          spaces.unshift(cleaned);
        }
      }

            const runSeparation = async () => {
        const promises = spaces.map(async (space) => {
          console.log(`[Stemmix] Attempting to load Hugging Face Space: ${space}`);
          const hfApp = await client(space);
          const res = await hfApp.predict("/separate_stems", {
            audio_file: handle_file(blob),
          });
          if (res && res.data) {
            console.log(`[Stemmix] Successfully separated stems using Space: ${space}`);
            return { res, space };
          }
          throw new Error("No data");
        });
        
        try {
          return await Promise.any(promises);
        } catch (e) {
          console.log(`[Stemmix] AI models unavailable, switching to WebGPU mode`);
          return null;
        }
      };

      try {
         result = await Promise.race([
             runSeparation(),
             new Promise((_, reject) => setTimeout(() => reject(new Error("AI Cloud processing took too long. Falling back to local DSP.")), 180000))
         ]);
         if (result && result.res && result.res.data) {
             success = true;
         }
      } catch (timeoutErr) {
         console.warn("[Stemmix] Timeout:", timeoutErr.message);
      }

      if (success && result && result.res && result.res.data) {
        console.log(`[Stemmix] AI separation result data:`, JSON.stringify(result.res.data, null, 2));
        const spaceUrl = `https://${result.space.replace('/', '-')}.hf.space`;
        const getUrl = (item: any) => {
            if (!item) return null;
            let u = typeof item === 'string' ? item : (item.url || item.path);
            if (!u || typeof u !== 'string' || !u.includes('hf.space') && !u.startsWith('http') && !u.startsWith('/')) {
              return null; // Ignore non-url strings
            }
            if (u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost') || u.startsWith('http://0.0.0.0')) {
              const urlObj = new URL(u);
              u = `${spaceUrl}${urlObj.pathname}${urlObj.search}`;
            } else if (u.startsWith('/')) {
              u = `${spaceUrl}${u}`;
            }
            return u;
        };
        
        let vocals, drums, bass, guitar, piano, other;
        if (Array.isArray(result.res.data)) {
          for (const item of result.res.data) {
            if (item && typeof item === 'object' && item.orig_name) {
              const name = item.orig_name.toLowerCase();
              const u = getUrl(item);
              if (!u) continue;
              
              if (name.includes('vocal')) vocals = u;
              else if (name.includes('drum')) drums = u;
              else if (name.includes('bass')) bass = u;
              else if (name.includes('guitar')) guitar = u;
              else if (name.includes('piano')) piano = u;
              else if (name.includes('other')) other = u;
            }
          }
        }
        
        if (!vocals && !drums && !bass && !other && Array.isArray(result.res.data)) {
          // Fallback if the space doesn't use orig_name or returns strings/simple objects
          // Assuming typical output order if the first item isn't a string message
          let offset = 0;
          if (result.res.data.length > 2 && (typeof result.res.data[0] === 'string' || (result.res.data[0] && result.res.data[0].__type__ === 'update'))) {
              offset = 2;
          }
          vocals = getUrl(result.res.data[offset]);
          drums = getUrl(result.res.data[offset+1]);
          bass = getUrl(result.res.data[offset+2]);
          other = getUrl(result.res.data[offset+3]);
          guitar = getUrl(result.res.data[offset+4]);
          piano = getUrl(result.res.data[offset+5]);
        }
        
        const formatProxyUrl = (u?: string) => u ? `/api/proxy-stream?url=${encodeURIComponent(u)}` : null;
        
        const stems = {
            status: "Success",
            vocals: formatProxyUrl(vocals),
            drums: formatProxyUrl(drums),
            bass: formatProxyUrl(bass),
            guitar: formatProxyUrl(guitar),
            piano: formatProxyUrl(piano),
            other: formatProxyUrl(other),
            isDspFallback: false
        };
        return res.json({ success: true, stems });
      }

      console.log(`[Stemmix] AI separation spaces failed.`);
      return res.status(400).json({ 
        success: false, 
        error: "AI Cloud servers are currently overloaded or offline. Please select the ⚡ WebGPU mode to process it locally." 
      });
    } catch (error) {
      console.error("[Stemmix Error]", error);
      res.status(500).json({ error: error.message || "Failed to separate stems" });
    }
  });

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
           const audioUrl = `https://www.tiktok.com/@${unique_id}`;
           const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(audioUrl)}`;
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

  // TKaraoke API endpoints
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
      if (!info) {
        return res.status(400).json({ error: "Could not extract metadata from URL" });
      }

      const responseData = {
        title: info.title || "Shared Audio Track",
        cover: info.thumbnail || info.thumbnails?.[0]?.url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300",
        author: info.uploader || info.artist || "Web Audio",
        duration: info.duration || 0,
      };

      res.json(responseData);
    } catch (error: any) {
      console.error("[Metadata API Error]", error);
      res.status(500).json({ error: error.message || "Failed to extract metadata" });
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      };
      
      if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
        headers["Referer"] = "https://www.nhaccuatui.com/";
        headers["Origin"] = "https://www.nhaccuatui.com";
      }

      let finalUrl = url;
      if (!url.startsWith("http")) {
        finalUrl = `http://localhost:3000${url}`;
      }

      const isDirect = finalUrl.toLowerCase().includes(".mp3") || finalUrl.toLowerCase().includes(".m4a") || finalUrl.toLowerCase().includes(".flac") || finalUrl.toLowerCase().includes(".wav");
      if (!isDirect && (finalUrl.includes("youtube.com") || finalUrl.includes("youtu.be") || finalUrl.includes("soundcloud.com") || finalUrl.includes("facebook.com") || finalUrl.includes("fb.watch"))) {
        try {
          finalUrl = await getDirectMediaUrl(finalUrl);
        } catch (err: any) {
          console.error(`[Download API] Failed to get direct media url:`, err.message);
        }
      }

      const response = await fetch(finalUrl, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch media from source. Status: ${response.status}`);
      }

      let contentType = response.headers.get("content-type") || "audio/mpeg";
      let extension = "mp3";
      if (contentType.includes("m4a") || finalUrl.includes(".m4a")) {
        extension = "m4a";
      } else if (contentType.includes("flac") || finalUrl.toLowerCase().includes(".flac")) {
        extension = "flac";
        contentType = "audio/flac";
      } else if (contentType.includes("wav") || finalUrl.toLowerCase().includes(".wav")) {
        extension = "wav";
        contentType = "audio/wav";
      }

      const safeTitle = title.replace(/[^a-zA-Z0-9\s-_]/g, "").trim() || "audio";
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(safeTitle)}.${extension}"`);
      res.setHeader("Content-Type", contentType);

      const contentLength = response.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);

      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.pipe(res);
        res.on("close", () => nodeStream.destroy());
      } else {
        res.status(500).json({ error: "No body in audio stream source." });
      }
    } catch (error: any) {
      console.error(`[Download API Error]`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Failed to download media." });
      }
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

startServer();
