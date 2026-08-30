const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
const startMatch = "      const strategies = [";
const endMatch = "        // Strategy 3: HTML fetch + proxy via AllOrigins";
const startIndex = code.indexOf(startMatch);
const endIndex = code.indexOf(endMatch);
if (startIndex !== -1 && endIndex !== -1) {
  const newStrategies = `      const strategies = [
        // Strategy 1: yt-dlp backend
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
          
          const profileUrl = \`https://www.tiktok.com/@\${unique_id}\`;
          console.log(\`[Strategy 1] Using yt-dlp to fetch TikTok profile: \${profileUrl}\`);
          const info = await youtubedl(profileUrl, ytdlOptions) as any;
          
          if (info && info.entries && info.entries.length > 0) {
            const mappedVideos = info.entries.map((entry) => {
              const videoUrl = entry.url || \`https://www.tiktok.com/@\${unique_id}/video/\${entry.id}\`;
              return {
                video_id: entry.id,
                title: entry.title || "TikTok Video",
                audioUrl: \`/api/stream?url=\${encodeURIComponent(videoUrl)}\`,
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
        
`;
  code = code.substring(0, startIndex) + newStrategies + code.substring(endIndex);
  fs.writeFileSync('server.ts', code);
  console.log("Success");
} else {
  console.log("Indices not found");
}
