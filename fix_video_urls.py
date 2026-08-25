import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Fix Block 1: lines 3197-3207
target1 = """        return {
          id: v.video_id || v.id || Date.now().toString() + Math.random(),
          title: v.title || v.desc || "TikTok Audio",
          originalUrl: "https://www.tiktok.com/@" + normalizedUsername + "/video/" + (v.video_id || v.id),
          audioUrl: proxiedAudioUrl,
          videoUrl: proxiedAudioUrl,
          cover: musicCover,
          author: videoAuthor,
          timestamp: Date.now()
        };"""

replacement1 = """        const rawVideoUrl = v.play || v.video_info?.play;
        return {
          id: v.video_id || v.id || Date.now().toString() + Math.random(),
          title: v.title || v.desc || "TikTok Audio",
          originalUrl: "https://www.tiktok.com/@" + normalizedUsername + "/video/" + (v.video_id || v.id),
          audioUrl: proxiedAudioUrl,
          videoUrl: rawVideoUrl || proxiedAudioUrl,
          cover: musicCover,
          author: videoAuthor,
          timestamp: Date.now()
        };"""
content = content.replace(target1, replacement1)

# Fix Block 2: lines 3395-3405
target2 = """        const newSong = {
          id: "yt_" + Date.now().toString(),
          title: data.title || "Shared Audio Track",
          originalUrl: urlToUse,
          audioUrl: streamUrl,
          videoUrl: (urlToUse.includes("tiktok.com") || urlToUse.includes("youtube.com") || urlToUse.includes("youtu.be") || urlToUse.includes("facebook.com") || urlToUse.includes("fb.watch")) ? streamUrl : null,
          cover: defaultCover,
          author: data.author || "Web Audio",
          timestamp: Date.now()
        };"""

replacement2 = """        const newSong = {
          id: "yt_" + Date.now().toString(),
          title: data.title || "Shared Audio Track",
          originalUrl: urlToUse,
          audioUrl: streamUrl,
          videoUrl: data.url || ((urlToUse.includes("tiktok.com") || urlToUse.includes("youtube.com") || urlToUse.includes("youtu.be") || urlToUse.includes("facebook.com") || urlToUse.includes("fb.watch")) ? streamUrl : null),
          cover: defaultCover,
          author: data.author || "Web Audio",
          timestamp: Date.now()
        };"""
content = content.replace(target2, replacement2)

# Fix Block 4: lines 3644-3656
target4 = """        const newSongs = videos.filter((v: any) => v.music || v.play || v.music_info || v.audioUrl).map((v: any) => {
          const rawAudioUrl = v.audioUrl || v.music || v.play || v.music_info?.play;
          const proxiedAudioUrl = rawAudioUrl && rawAudioUrl.startsWith("http") && !rawAudioUrl.includes("/api/stream") ? `/api/proxy-stream?url=${encodeURIComponent(rawAudioUrl)}` : rawAudioUrl;
          
          const rawVideoUrl = v.play || v.video_info?.play;
          const proxiedVideoUrl = (rawVideoUrl && rawVideoUrl.startsWith("http") && !rawVideoUrl.includes("/api/stream"))
                                  ? `/api/proxy-stream?url=${encodeURIComponent(rawVideoUrl)}`
                                  : (rawVideoUrl || proxiedAudioUrl);
                                  
          return {
            id: v.video_id || v.id || Date.now().toString() + Math.random(),
            title: v.title || v.desc || "TikTok Audio",
            originalUrl: "https://www.tiktok.com/@" + username + "/video/" + (v.video_id || v.id),
            audioUrl: proxiedAudioUrl,
            videoUrl: proxiedVideoUrl,"""

replacement4 = """        const newSongs = videos.filter((v: any) => v.music || v.play || v.music_info || v.audioUrl).map((v: any) => {
          const rawAudioUrl = v.audioUrl || v.music || v.play || v.music_info?.play;
          const proxiedAudioUrl = rawAudioUrl && rawAudioUrl.startsWith("http") && !rawAudioUrl.includes("/api/stream") ? `/api/proxy-stream?url=${encodeURIComponent(rawAudioUrl)}` : rawAudioUrl;
          
          const rawVideoUrl = v.play || v.video_info?.play;
                                  
          return {
            id: v.video_id || v.id || Date.now().toString() + Math.random(),
            title: v.title || v.desc || "TikTok Audio",
            originalUrl: "https://www.tiktok.com/@" + username + "/video/" + (v.video_id || v.id),
            audioUrl: proxiedAudioUrl,
            videoUrl: rawVideoUrl || proxiedAudioUrl,"""
content = content.replace(target4, replacement4)

# Fix Block 5: line 3702
target5 = """      const newSong = {
        id: "tiktok_" + Date.now().toString(),
        title: data.title || "TikTok Audio",
        originalUrl: urlToUse,
        audioUrl: streamUrl,
        videoUrl: streamUrl,
        cover: data.cover || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300","""

replacement5 = """      const newSong = {
        id: "tiktok_" + Date.now().toString(),
        title: data.title || "TikTok Audio",
        originalUrl: urlToUse,
        audioUrl: streamUrl,
        videoUrl: data.url || streamUrl,
        cover: data.cover || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300","""
content = content.replace(target5, replacement5)

# Fix Block 7: line 6241
target7 = """                              const songId = song.id || song.video_id || song.url || `search-result-${index}`;
                              const rawVideoUrl = song.play || (song.video_info && song.video_info.play);
                              let proxiedVideoUrl = rawVideoUrl;
                              if (rawVideoUrl && rawVideoUrl.startsWith("http") && !rawVideoUrl.includes("/api/stream")) {
                                  proxiedVideoUrl = `/api/proxy-stream?url=${encodeURIComponent(rawVideoUrl)}`;
                              }
                              
                              const newSong = {
                                id: songId,
                                title: songTitle,
                                originalUrl: oembedUrl,
                                audioUrl: streamUrl,
                                videoUrl: proxiedVideoUrl || null,"""

replacement7 = """                              const songId = song.id || song.video_id || song.url || `search-result-${index}`;
                              const rawVideoUrl = song.play || (song.video_info && song.video_info.play);
                              
                              const newSong = {
                                id: songId,
                                title: songTitle,
                                originalUrl: oembedUrl,
                                audioUrl: streamUrl,
                                videoUrl: rawVideoUrl || null,"""
content = content.replace(target7, replacement7)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Finished replacements")
