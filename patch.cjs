const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const searchStr = `    shouldAutoPlayRef.current = true;
    setIsAIAnalyzing(false);
    setCurrentSong(song);
    setFileName(song.title || "TikTok Audio");
    setTiktokUrl(song.originalUrl || "");

    resumeContext();`;
const replaceStr = `    shouldAutoPlayRef.current = true;
    setIsAIAnalyzing(false);
    setCurrentSong(song);
    setFileName(song.title || "TikTok Audio");
    setTiktokUrl(song.originalUrl || "");

    // Lazy load / refetch fresh artwork when fetching audio for TikTok songs
    if (song.originalUrl && song.originalUrl.includes("tiktok.com")) {
      fetch(\`/api/metadata?url=\${encodeURIComponent(song.originalUrl)}\`)
        .then(res => res.json())
        .then(data => {
          if (data && data.cover && data.cover !== song.cover) {
            console.log("Refetched fresh cover for TikTok song");
            setRecentSongs(curr => curr.map(s => s.id === song.id ? { ...s, cover: data.cover } : s));
            setCurrentSong(prev => prev && prev.id === song.id ? { ...prev, cover: data.cover } : prev);
          }
        })
        .catch(err => console.warn("Failed to refetch fresh cover", err));
    }

    resumeContext();`;
code = code.replace(searchStr, replaceStr);
fs.writeFileSync('src/App.tsx', code);
console.log("Success");
