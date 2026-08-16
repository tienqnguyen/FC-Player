const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const regex = /app\.get\("\/api\/download", async \(req, res\) => \{[\s\S]*?(?=\n  app\.post\("\/api\/lyric\/format")/;
const replacement = `app.get("/api/download", async (req, res) => {
    try {
      const url = req.query.url as string;
      const title = (req.query.title as string) || "audio";
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }
      console.log(\`[Download API] Downloading and proxying: \${url}\`);

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
        finalUrl = \`http://localhost:3000\${finalUrl}\`;
      }

      let safeTitle = title.replace(/[^a-zA-Z0-9\\s_-]/g, "").trim();
      if (safeTitle.length > 30) safeTitle = safeTitle.substring(0, 30).trim();
      if (!safeTitle) safeTitle = "audio";

      const isDirect =
        finalUrl.toLowerCase().includes(".mp3") ||
        finalUrl.toLowerCase().includes(".m4a") ||
        finalUrl.toLowerCase().includes(".flac") ||
        finalUrl.toLowerCase().includes(".wav");

      let response: any = null;

      if (!isDirect && (finalUrl.includes("youtube.com") || finalUrl.includes("youtu.be") || finalUrl.includes("facebook.com") || finalUrl.includes("fb.watch"))) {
          try {
            finalUrl = await getDirectMediaUrl(finalUrl);
          } catch(e) { }
      }

      // If it's a tiktok page URL (not CDN), don't fetch directly because it returns HTML
      const isTikTokPage = finalUrl.includes("tiktok.com") && !finalUrl.includes("tiktokcdn");

      if (!isTikTokPage) {
        try {
          response = await fetch(finalUrl, { headers });
          if (!response.ok || response.headers.get("content-type")?.includes("text/html")) {
            console.warn(\`[Download API] Direct fetch failed or returned HTML: \${response?.status}, falling back to yt-dlp...\`);
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
          \`attachment; filename="\${encodeURIComponent(safeTitle)}.m4a"\`
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
        \`attachment; filename="\${encodeURIComponent(safeTitle)}.\${extension}"\`
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
  });`;

content = content.replace(regex, replacement);
fs.writeFileSync('server.ts', content);
console.log("Patched /api/download in server.ts");
