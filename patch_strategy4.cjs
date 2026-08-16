const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const strategy3Str = `        // Strategy 3: HTML fetch + proxy via AllOrigins
        async () => {`;

const strategy4Str = `        // Strategy 4: yt-dlp backend
        async () => {
          const ytdlOptions = {
            dumpSingleJson: true,
            flatPlaylist: true,
            noWarnings: true,
            jsRuntimes: "node",
            noCheckCertificates: true,
          };
          if (await hasYoutubeCookies()) {
            ytdlOptions.cookies = getCookiesFilePath();
          }
          
          const profileUrl = \`https://www.tiktok.com/@\${unique_id}\`;
          console.log(\`[Strategy 4] Using yt-dlp to fetch TikTok profile: \${profileUrl}\`);
          const info = await youtubedl(profileUrl, ytdlOptions);
          
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
        
        // Strategy 3: HTML fetch + proxy via AllOrigins
        async () => {`;

content = content.replace(strategy3Str, strategy4Str);
fs.writeFileSync('server.ts', content);
console.log("Added Strategy 4 to server.ts");
