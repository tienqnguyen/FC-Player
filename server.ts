import express from "express";
import { createServer as createViteServer } from "vite";
import ytdl from "@distube/ytdl-core";
import cors from "cors";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

  // API to stream youtube audio
  app.get("/api/stream", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url || !ytdl.validateURL(url)) {
        res.status(400).json({ error: "Invalid YouTube URL" });
        return;
      }

      const info = await ytdl.getInfo(url);
      const audioFormat = ytdl.chooseFormat(info.formats, {
        quality: "highestaudio",
      });

      res.header("Content-Type", "audio/mpeg");
      res.header("Accept-Ranges", "bytes");
      res.header(
        "Content-Disposition",
        `inline; filename="${info.videoDetails.title}.mp3"`,
      );

      ytdl(url, { format: audioFormat }).pipe(res);
    } catch (error: any) {
      console.error(error);
      res
        .status(500)
        .json({ error: error.message || "Failed to string YouTube url" });
    }
  });

  // API to get youtube metadata
  app.get("/api/metadata", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url || !ytdl.validateURL(url)) {
        res.status(400).json({ error: "Invalid YouTube URL" });
        return;
      }
      const info = await ytdl.getInfo(url);
      res.json({ title: info.videoDetails.title });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tiktok/user", async (req, res) => {
    try {
      const unique_id = req.query.unique_id as string;
      const clientCursor = (req.query.cursor as string) || "0";
      const clientCount = (req.query.count as string) || "50";
      
      if (!unique_id) {
        return res.status(400).json({ error: "Username is required" });
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
            res.json({ 
              code: 0, 
              data: { 
                videos: result.videos, 
                cursor: result.cursor, 
                hasMore: result.hasMore 
              } 
            });
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
