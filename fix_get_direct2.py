import re

with open('server.ts', 'r') as f:
    content = f.read()

target = """        if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
          const rawHtml = await fetchNctPlaylistWithProxyRace(url);
          const parsedData = parseNctHtml(rawHtml);
          if (parsedData.songs && parsedData.songs.length > 0) {
            const firstSong = parsedData.songs[0];
            let directAudioUrl = firstSong.audioUrl || firstSong.originalUrl || url;
            if (directAudioUrl.includes("/api/proxy-stream?url=")) {
               directAudioUrl = decodeURIComponent(directAudioUrl.split("url=")[1]);
            }
            directStreamMemoryCache.set(url, { url: directAudioUrl, expiresAt: now + 45 * 60 * 1000 });
            return directAudioUrl;
          }
        }"""

replacement = """        if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
          const rawHtml = await fetchNctPlaylistWithProxyRace(url);
          const parsedData = parseNctHtml(rawHtml);
          if (parsedData.songs && parsedData.songs.length > 0) {
            const firstSong = parsedData.songs[0];
            let directAudioUrl = "";
            
            // Prefer the lossless or highest quality explicitly
            if (firstSong.qualities && firstSong.qualities.length > 0) {
                const lossless = firstSong.qualities.find((q: any) => q.quality.includes("lossless") || q.quality.includes("flac"));
                const high = firstSong.qualities.find((q: any) => q.quality.includes("320"));
                const best = lossless || high || firstSong.qualities[0];
                directAudioUrl = best.url;
            }
            if (!directAudioUrl) {
                directAudioUrl = firstSong.audioUrl || firstSong.originalUrl || url;
            }
            
            if (directAudioUrl.includes("/api/proxy-stream?url=")) {
               directAudioUrl = decodeURIComponent(directAudioUrl.split("url=")[1]);
            }
            directStreamMemoryCache.set(url, { url: directAudioUrl, expiresAt: now + 45 * 60 * 1000 });
            return directAudioUrl;
          }
        }
        
        if (url.includes("tkaraoke.com")) {
          const details = await fetchTKaraokeSongDetails(url);
          if (details && details.mp3Versions && details.mp3Versions.length > 0) {
             const audioUrl = details.mp3Versions[0].url;
             directStreamMemoryCache.set(url, { url: audioUrl, expiresAt: now + 45 * 60 * 1000 });
             return audioUrl;
          }
        }"""

content = content.replace(target, replacement)

target2 = """      if (!isDirect && (finalUrl.includes("youtube.com") || finalUrl.includes("youtu.be") || finalUrl.includes("facebook.com") || finalUrl.includes("fb.watch") || finalUrl.includes("nhaccuatui.com") || finalUrl.includes("nct.vn"))) {"""
replacement2 = """      if (!isDirect && (finalUrl.includes("youtube.com") || finalUrl.includes("youtu.be") || finalUrl.includes("facebook.com") || finalUrl.includes("fb.watch") || finalUrl.includes("nhaccuatui.com") || finalUrl.includes("nct.vn") || finalUrl.includes("tkaraoke.com"))) {"""

content = content.replace(target2, replacement2)

with open('server.ts', 'w') as f:
    f.write(content)

