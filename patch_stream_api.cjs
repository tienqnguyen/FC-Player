const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const regex = /app\.get\("\/api\/stream", async \(req, res\) => \{[\s\S]*?(?=\n  app\.get\("\/api\/proxy-stream)/;
const replacement = `app.get("/api/stream", async (req, res) => {
    try {
      let url = req.query.url as string;
      if (!url) {
        res.status(400).json({ error: "Invalid stream URL" });
        return;
      }
      url = await resolveFacebookRedirect(url);

      // Skip direct fetch for TikTok pages as they return HTML or block fetch
      const isTikTokPage = url.includes("tiktok.com") && !url.includes("tiktokcdn");
      
      let streamServed = false;
      if (!isTikTokPage) {
        try {
          const directUrl = await getDirectMediaUrl(url);
          console.log(
            \`[Stream Range Proxy] Streaming direct URL: \${directUrl.substring(0, 80)}...\`,
          );
          const headers: Record<string, string> = {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          };
          if (req.headers.range) headers["Range"] = req.headers.range;

          const response = await fetch(directUrl, { headers });
          if (!response.ok || response.headers.get("content-type")?.includes("text/html")) {
            throw new Error(\`Direct fetch failed or returned HTML: \${response.status}\`);
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
          console.warn(
            "[Stream Proxy] direct url failed, falling back to yt-dlp",
          );
        }
      }

      if (!streamServed) {
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
  });`;

content = content.replace(regex, replacement);
fs.writeFileSync('server.ts', content);
console.log("Patched /api/stream in server.ts");
