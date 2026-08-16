const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add state
content = content.replace(
  /const \[tiktokError, setTiktokError\] = useState\(""\);/,
  `const [tiktokError, setTiktokError] = useState("");\n  const [consecutiveFailures, setConsecutiveFailures] = useState(0);`
);

// 2. Modify playRecentSong
content = content.replace(
  /const playRecentSong = async \(song: any\) => \{/,
  `const playRecentSong = async (song: any, isAutoPlay = false) => {\n    if (!isAutoPlay) setConsecutiveFailures(0);`
);

// 3. Modify handleNextSong
content = content.replace(
  /const handleNextSong = \(\) => \{\n    if \(\!currentSong \|\| recentSongs\.length <= 1\) return;\n    const currentIndex = recentSongs\.findIndex\(s => s\.id === currentSong\.id\);\n    const nextIndex = \(currentIndex \+ 1\) % recentSongs\.length;\n    playRecentSong\(recentSongs\[nextIndex\]\);\n  \};/,
  `const handleNextSong = (isAutoPlay = false) => {
    if (!currentSong || recentSongs.length <= 1) return;
    const currentIndex = recentSongs.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % recentSongs.length;
    playRecentSong(recentSongs[nextIndex], isAutoPlay);
  };`
);

// 4. Modify onError
content = content.replace(
  /onError=\{\(e\) => \{[\s\S]*?if \(currentSong\) \{[\s\S]*?setTimeout\(\(\) => handleNextSong\(\), 500\);[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}\}/,
  `onError={(e) => {
            const err = (e.target as HTMLAudioElement).error;
            if (err) {
              console.warn("Audio element error event:", err.code, err.message);
              // Ignore MEDIA_ERR_ABORTED (code 1) or when audio is intentionally cleared
              if (err.code === 1 || !audioUrl) {
                return;
              }
              
              setConsecutiveFailures(prev => {
                const newFails = prev + 1;
                if (newFails >= 3) {
                  setTiktokError(\`Playback failed \${newFails} times in a row. Auto-play stopped to prevent looping errors.\`);
                  setIsPlaying(false);
                  setDuration(0);
                  setAudioUrl("");
                  return newFails;
                }
                
                setTiktokError(\`Failed to play audio source. Skipping...\`);
                setIsPlaying(false);
                setDuration(0);
                setAudioUrl("");
                
                if (currentSong) {
                  setRecentSongs(curr => curr.filter(s => s.id !== currentSong.id));
                  setTimeout(() => handleNextSong(true), 500);
                }
                
                return newFails;
              });
            }
          }}`
);

// 5. Modify onEnded
content = content.replace(
  /\} else if \(repeatMode === "all" && currentSong && recentSongs\.length > 1\) \{\n              handleNextSong\(\);\n            \}/,
  `} else if (repeatMode === "all" && currentSong && recentSongs.length > 1) {
              handleNextSong(true);
            }`
);

// 6. Reset consecutiveFailures onPlay
content = content.replace(
  /onPlay=\{\(\) => setIsPlaying\(true\)\}/,
  `onPlay={() => { setIsPlaying(true); setConsecutiveFailures(0); }}`
);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx for autoplay failures");
