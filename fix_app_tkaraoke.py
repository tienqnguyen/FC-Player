import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """            // Map the tkaraoke playlist to recentSongs format
            const mappedSongs = songsList.map((s: any, idx: number) => ({
                id: "tkar_" + idx + "_" + Date.now().toString(),
                title: s.title || "TKaraoke Track",
                originalUrl: s.url,
                audioUrl: s.url, 
                cover: "https://images.unsplash.com/photo-1516280440502-127db8e0586e?q=80&w=300",
                author: "TKaraoke",
                timestamp: Date.now(),
                isTKaraokePlaylistTrack: true 
            }));"""

replacement = """            // Map the tkaraoke playlist to recentSongs format
            const mappedSongs = songsList.map((s: any, idx: number) => {
                const finalAudio = s.audioUrl || s.url;
                return {
                    id: "tkar_" + idx + "_" + Date.now().toString(),
                    title: s.title || "TKaraoke Track",
                    originalUrl: s.url,
                    audioUrl: finalAudio, 
                    cover: "https://images.unsplash.com/photo-1516280440502-127db8e0586e?q=80&w=300",
                    author: "TKaraoke",
                    timestamp: Date.now(),
                    isTKaraokePlaylistTrack: !s.audioUrl // Only fetch details if we didn't find mp3 in playlist
                };
            });"""

content = content.replace(target, replacement)

with open('src/App.tsx', 'w') as f:
    f.write(content)

