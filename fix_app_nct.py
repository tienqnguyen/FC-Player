import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """        const { title, songs } = json.data;
        if (!songs || songs.length === 0) {
          throw new Error("No play-ready audio tracks found in this NhacCuaTui link/source.");
        }
        
        // Load songs into queue
        setRecentSongs(songs);"""

replacement = """        const { title, songs } = json.data;
        if (!songs || songs.length === 0) {
          throw new Error("No play-ready audio tracks found in this NhacCuaTui link/source.");
        }
        
        // Ensure proxy is applied (in case of cached responses that had direct links)
        const proxiedSongs = songs.map((s: any) => {
            if (s.audioUrl && s.audioUrl.startsWith("http") && !s.audioUrl.includes("/api/proxy-stream")) {
                s.audioUrl = `/api/proxy-stream?url=${encodeURIComponent(s.audioUrl)}`;
            }
            if (s.qualities) {
                s.qualities = s.qualities.map((q: any) => {
                   if (q.url && q.url.startsWith("http") && !q.url.includes("/api/proxy-stream")) {
                       q.url = `/api/proxy-stream?url=${encodeURIComponent(q.url)}`;
                   }
                   return q;
                });
            }
            return s;
        });

        // Load songs into queue
        setRecentSongs(proxiedSongs);"""

content = content.replace(target, replacement)

# We also need to fix `playRecentSong(songs[0]);` to `playRecentSong(proxiedSongs[0]);`
content = content.replace("playRecentSong(songs[0]);", "playRecentSong(proxiedSongs[0]);")

with open('src/App.tsx', 'w') as f:
    f.write(content)
