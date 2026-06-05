import express from "express";
import { createServer as createViteServer } from "vite";
import youtubedl from "youtube-dl-exec";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { fetchNctPlaylistWithProxyRace, parseNctHtml } from "./server/nctParser";
import { hasYoutubeCookies, getCookiesFilePath, saveYoutubeCookies, getYoutubeCookiesStatus } from "./server/youtubeCookieHelper";
import { getCachedData, setCachedData, invalidateCache } from "./server/cacheHelper";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // API to stream audio of YouTube, Facebook, SoundCloud, etc.
  app.get("/api/stream", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        res.status(400).json({ error: "Invalid stream URL" });
        return;
      }

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
      const url = req.query.url as string;
      if (!url) {
        res.status(400).json({ error: "Invalid URL" });
        return;
      }
      
      const ytdlOptions: any = {
        dumpSingleJson: true,
        noWarnings: true,
        noPlaylist: true,
        f: "all",
        jsRuntimes: "node",
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
      const url = req.query.url as string;
      const title = (req.query.title as string) || "audio";
      
      if (!url) {
        res.status(400).json({ error: "Invalid URL" });
        return;
      }

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
      
      const contentType = response.headers.get("content-type");
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
          console.error("[Proxy Stream Pipe Error]", err.message);
          if (!res.writableEnded) res.end();
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
