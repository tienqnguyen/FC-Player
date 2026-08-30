const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `    setTiktokUrl(song.originalUrl || "");
    resumeContext();`;

const replacement = `    setTiktokUrl(song.originalUrl || "");

    // Lazy load / refetch fresh artwork when fetching audio for TikTok songs
    if (song.originalUrl && (song.originalUrl.includes("tiktok.com") || song.originalUrl.includes("tikwm.com"))) {
      fetch(\`/api/metadata?url=\${encodeURIComponent(song.originalUrl)}\`)
        .then(res => res.json())
        .then(data => {
          if (data && data.cover && data.cover !== song.cover && !data.cover.includes("hqdefault.jpg")) {
            console.log("Refetched fresh cover for TikTok song");
            setRecentSongs(curr => curr.map(s => s.id === song.id ? { ...s, cover: data.cover } : s));
            setCurrentSong(prev => prev && prev.id === song.id ? { ...prev, cover: data.cover } : prev);
          }
        })
        .catch(err => console.warn("Failed to refetch fresh cover", err));
    }

    resumeContext();`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Success");
} else {
  console.log("Could not find target string");
}
