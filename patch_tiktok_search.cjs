const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldSearch = `  // 2. TikTok Search (via Tikwm API)
  app.get("/api/tiktok/search", async (req, res) => { console.log("HIT TIKTOK SEARCH API"); 
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
        type: searchType === "sound" ? "music" : "1",
      });

      const response = await fetch("https://www.tikwm.com/api/feed/search", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        if (text.includes("<html") || text.includes("<!DOCTYPE")) {
          return res.status(502).json({ error: "TikTok search is currently blocked by Cloudflare protection. The service might be temporarily unavailable." });
        }
        return res.status(500).json({ error: "Invalid JSON response from TikTok search API." });
      }

      if (data.code === 0 && data.data?.videos?.length > 0) {
        return res.json({
          videos: data.data.videos,
          cursor: (data.data.cursor || "").toString(),
          hasMore: !!data.data.hasMore,
        });
      }

      return res.json({ videos: [], cursor: "0", hasMore: false });
    } catch (error: any) {
      console.error("[Search Error]", error.message);
      res.status(500).json({ error: error.message });
    }
  });`;

const newSearch = `  // 2. TikTok Search (via Tikwm API with yt-dlp fallback)
  app.get("/api/tiktok/search", async (req, res) => {
    try {
      const keywords = req.query.q as string;
      const clientCursor = (req.query.cursor as string) || "0";
      const clientCount = (req.query.count as string) || "30";
      const searchType = (req.query.type as string) || "video";

      if (!keywords) {
        return res.status(400).json({ error: "Search query is required" });
      }

      // Strategy 1: Tikwm
      try {
        const params = new URLSearchParams({
          keywords,
          count: clientCount,
          cursor: clientCursor,
          type: searchType === "sound" ? "music" : "1",
        });

        const response = await fetch("https://www.tikwm.com/api/feed/search", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        });

        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (err) {
          throw new Error("Tikwm blocked by Cloudflare");
        }

        if (data.code === 0 && data.data?.videos?.length > 0) {
          return res.json({
            videos: data.data.videos,
            cursor: (data.data.cursor || "").toString(),
            hasMore: !!data.data.hasMore,
          });
        }
        // If data.code !== 0, throw to fallback
        throw new Error("Tikwm returned no results or failed");
      } catch (tikwmError: any) {
        console.warn("[TikTok Search] Tikwm failed, falling back to yt-dlp:", tikwmError.message);
        
        // Strategy 2: yt-dlp youtube search fallback (since TikTok search natively isn't supported via yt-dlp)
        const count = parseInt(clientCount) || 15;
        const query = \`ytsearch\${count}:\${keywords} \${searchType === "sound" ? "tiktok sound" : "tiktok"}\`;
        
        const ytdlOptions: any = {
          dumpSingleJson: true,
          flatPlaylist: true,
          noWarnings: true,
        };

        if (await hasYoutubeCookies()) {
          ytdlOptions.cookies = getCookiesFilePath();
        }

        const info = await youtubedl(query, ytdlOptions);
        if (info && info.entries && info.entries.length > 0) {
          const videos = info.entries.map((v: any) => ({
            id: v.id,
            video_id: v.id,
            title: v.title,
            desc: v.title,
            url: v.url || \`https://www.youtube.com/watch?v=\${v.id}\`,
            author: {
              nickname: v.uploader || "YouTube Creator"
            },
            duration: v.duration,
            cover: v.thumbnails?.[0]?.url || \`https://i.ytimg.com/vi/\${v.id}/hqdefault.jpg\`
          }));
          
          return res.json({
            videos,
            cursor: "0",
            hasMore: false
          });
        }
        
        return res.json({ videos: [], cursor: "0", hasMore: false });
      }
    } catch (error: any) {
      console.error("[Search Error]", error.message);
      res.status(500).json({ error: error.message });
    }
  });`;

content = content.replace(oldSearch, newSearch);
fs.writeFileSync('server.ts', content);
console.log("Patched TikTok search with yt-dlp fallback");
