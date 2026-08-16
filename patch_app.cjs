const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix handleDownload
content = content.replace(
  /let targetUrl = song\.id\?\.toString\(\)\.startsWith\("yt_"\) \? song\.originalUrl : song\.audioUrl;[\s\S]*?(?=\s*const downloadUrl = `\/api\/download)/,
  `let targetUrl = song.originalUrl || song.audioUrl || "";
    // If we only have a proxy URL, extract it, but originalUrl is always preferred for yt-dlp compatibility
    if (!song.originalUrl && targetUrl && (targetUrl.startsWith("/api/proxy-stream") || targetUrl.includes("/api/proxy-stream"))) {
      try {
        const urlObj = new URL(targetUrl, window.location.origin);
        let extractedUrl = urlObj.searchParams.get("url");
        if (extractedUrl) targetUrl = extractedUrl;
      } catch (err) {}
    }`
);

// Fix handleDownloadCurrentAudio
const oldAudioBlock = `    let originalUrl = currentSong?.originalUrl || targetUrl;
    let finalUrl = targetUrl;
    
    if (targetUrl.includes("/api/proxy-stream?url=")) {
      originalUrl = decodeURIComponent(targetUrl.split("url=")[1]);
    } else if (targetUrl.includes("/api/stream?url=")) {
      originalUrl = decodeURIComponent(targetUrl.split("url=")[1]);
    }`;

const newAudioBlock = `    let originalUrl = currentSong?.originalUrl || targetUrl;
    
    // Only extract from proxy if we don't have a valid originalUrl
    if (!currentSong?.originalUrl) {
      if (targetUrl.includes("/api/proxy-stream?url=")) {
        originalUrl = decodeURIComponent(targetUrl.split("url=")[1]);
      } else if (targetUrl.includes("/api/stream?url=")) {
        originalUrl = decodeURIComponent(targetUrl.split("url=")[1]);
      }
    }`;

content = content.replace(oldAudioBlock, newAudioBlock);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx downloads");
