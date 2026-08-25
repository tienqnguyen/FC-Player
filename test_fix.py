import re

with open('server.ts', 'r') as f:
    content = f.read()

replacement = """      let url = req.query.url as string;
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
"""

content = re.sub(
    r'      let url = req\.query\.url as string;\n      if \(!url\) \{\n        return res\.status\(400\)\.json\(\{ error: "URL parameter is required" \}\);\n      \}\n      url = await resolveFacebookRedirect\(url\);\n      console\.log\(`\[Metadata API\] Resolving metadata for URL: \$\{url\}`\);',
    replacement,
    content,
    flags=re.MULTILINE
)

with open('server.ts', 'w') as f:
    f.write(content)
