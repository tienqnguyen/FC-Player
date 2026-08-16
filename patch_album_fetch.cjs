const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `      const newSongs = videos.filter((v: any) => v.music || v.play || v.music_info || v.audioUrl).map((v: any) => {
        const videoAuthor = v.author?.nickname || authorObj?.nickname || \`@\${normalizedUsername}\`;
        const musicCover = v.music_info?.cover || v.cover || v.origin_cover;
        return {
          id: v.video_id || v.id || Date.now().toString() + Math.random(),
          title: v.title || v.desc || "TikTok Audio",
          originalUrl: "https://www.tiktok.com/@" + normalizedUsername + "/video/" + (v.video_id || v.id),
          audioUrl: v.audioUrl || v.music || v.play || v.music_info?.play,
          cover: musicCover,
          author: videoAuthor,
          timestamp: Date.now()
        };
      });`;

const replacementStr = `      const newSongs = videos.filter((v: any) => v.music || v.play || v.music_info || v.audioUrl).map((v: any) => {
        const videoAuthor = v.author?.nickname || authorObj?.nickname || \`@\${normalizedUsername}\`;
        const musicCover = v.music_info?.cover || v.cover || v.origin_cover;
        
        const rawAudioUrl = v.audioUrl || v.music || v.play || v.music_info?.play;
        const isAlreadyProxied = rawAudioUrl && rawAudioUrl.includes("/api/stream");
        const proxiedAudioUrl = (rawAudioUrl && rawAudioUrl.startsWith("http") && !isAlreadyProxied) 
                                ? \`/api/proxy-stream?url=\${encodeURIComponent(rawAudioUrl)}\` 
                                : rawAudioUrl;
                                
        return {
          id: v.video_id || v.id || Date.now().toString() + Math.random(),
          title: v.title || v.desc || "TikTok Audio",
          originalUrl: "https://www.tiktok.com/@" + normalizedUsername + "/video/" + (v.video_id || v.id),
          audioUrl: proxiedAudioUrl,
          videoUrl: proxiedAudioUrl,
          cover: musicCover,
          author: videoAuthor,
          timestamp: Date.now()
        };
      });`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/App.tsx', content);
console.log("Patched album fetch");
