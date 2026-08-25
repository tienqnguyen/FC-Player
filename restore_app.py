import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Fix Block 1
target1 = """          let playUrl = firstSong.audioUrl;

          setAudioUrl(playUrl);
          setFileName(firstSong.title || "Default Song");"""
replacement1 = """          let playUrl = firstSong.audioUrl;
          if (playUrl && (playUrl.includes("nct.vn") || playUrl.includes("nhaccuatui.com")) && !playUrl.includes("/api/proxy-stream")) {
            playUrl = `/api/proxy-stream?url=${encodeURIComponent(playUrl)}`;
          }
          setAudioUrl(playUrl);
          setFileName(firstSong.title || "Default Song");"""
content = content.replace(target1, replacement1)

# Fix Block 2
target2 = """        let playUrl = firstSong.audioUrl;

        setAudioUrl(playUrl);
        setFileName(firstSong.title || "Default Song");"""
replacement2 = """        let playUrl = firstSong.audioUrl;
        if (playUrl && (playUrl.includes("nct.vn") || playUrl.includes("nhaccuatui.com")) && !playUrl.includes("/api/proxy-stream")) {
          playUrl = `/api/proxy-stream?url=${encodeURIComponent(playUrl)}`;
        }
        setAudioUrl(playUrl);
        setFileName(firstSong.title || "Default Song");"""
content = content.replace(target2, replacement2)

# Fix Block 3
target3 = """    if (!isLocalUploaded) {
      setUploadedFile(null);
    }

    if (!playUrl) return;"""
replacement3 = """    if (!isLocalUploaded) {
      setUploadedFile(null);
    }
    if (playUrl && (playUrl.includes("nct.vn") || playUrl.includes("nhaccuatui.com")) && !playUrl.includes("/api/proxy-stream")) {
      playUrl = `/api/proxy-stream?url=${encodeURIComponent(playUrl)}`;
    }

    if (!playUrl) return;"""
content = content.replace(target3, replacement3)

# Fix Block 4
target4 = """                              // If NhacCuaTui direct stream url is already loaded!
                              const streamUrl = song.url;"""
replacement4 = """                              // If NhacCuaTui proxy stream url is already loaded!
                              const streamUrl = song.url.includes("api/proxy-stream") 
                                ? song.url 
                                : `/api/proxy-stream?url=${encodeURIComponent(song.url)}`;"""
content = content.replace(target4, replacement4)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Restored frontend logic")
