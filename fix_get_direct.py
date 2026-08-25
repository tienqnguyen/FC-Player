import re

with open('server.ts', 'r') as f:
    content = f.read()

target = """            const directAudioUrl = firstSong.audioUrl || firstSong.originalUrl || url;
            directStreamMemoryCache.set(url, { url: directAudioUrl, expiresAt: now + 45 * 60 * 1000 });
            return directAudioUrl;"""

replacement = """            let directAudioUrl = firstSong.audioUrl || firstSong.originalUrl || url;
            if (directAudioUrl.includes("/api/proxy-stream?url=")) {
               directAudioUrl = decodeURIComponent(directAudioUrl.split("url=")[1]);
            }
            directStreamMemoryCache.set(url, { url: directAudioUrl, expiresAt: now + 45 * 60 * 1000 });
            return directAudioUrl;"""

content = content.replace(target, replacement)

with open('server.ts', 'w') as f:
    f.write(content)
