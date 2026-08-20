const fs = require("fs");
let content = fs.readFileSync("server.ts", "utf-8");
const startMarker = "// Strategy 4: High-Reliability TikTok Web & Audio Indexer";
const endMarker = "return res.json({ videos: [], cursor: \"0\", hasMore: false });";
const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);
if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `      // Strategy 3: Direct yt-dlp on TikTok search URL (as requested by user)
      try {
        const searchUrl = \`https://www.tiktok.com/search?q=\${encodeURIComponent(keywords)}\`;
        console.log(\`[TikTok Search] Direct search query via yt-dlp: \${searchUrl}\`);
        const ytdlOptions = {
          dumpSingleJson: true,
          flatPlaylist: true,
          playlistEnd: parseInt(clientCount) || 20,
          noWarnings: true,
        };
        const info = await youtubedl(searchUrl, ytdlOptions);
        if (info && info.entries && info.entries.length > 0) {
          const videos = info.entries.map((entry, idx) => {
            const videoUrl = entry.url || \`https://www.tiktok.com/@\${entry.uploader || "user"}/video/\${entry.id}\`;
            const bestThumb = Array.isArray(entry.thumbnails) && entry.thumbnails.length > 0
              ? entry.thumbnails[entry.thumbnails.length - 1]?.url || entry.thumbnails[0]?.url
              : \`https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300\`;
            return {
              id: entry.id || \`tt_\${idx}\`,
              video_id: entry.id || \`tt_\${idx}\`,
              title: entry.title || \`\${keywords} TikTok Search\`,
              desc: entry.description || entry.title || \`#\${keywords}\`,
              url: videoUrl,
              audioUrl: \`/api/stream?url=\${encodeURIComponent(videoUrl)}\`,
              author: {
                nickname: entry.uploader || "Creator",
                unique_id: \`@\${entry.uploader || "creator"}\`,
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
        console.warn(\`[TikTok Search] yt-dlp search query failed (Note: yt-dlp may not support tiktok search URLs yet): \${searchErr.message}\`);
      }

      return res.json({ videos: [], cursor: "0", hasMore: false });`;
  content = content.substring(0, startIdx) + replacement + content.substring(endIdx + endMarker.length);
  fs.writeFileSync("server.ts", content);
  console.log("Successfully patched server.ts");
} else {
  console.error("Could not find markers");
}
