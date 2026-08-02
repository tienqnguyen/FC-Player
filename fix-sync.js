const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `      const duration = audioRef.current.duration;
      
      // Calculate smooth volume`;

const replacement = `      const duration = audioRef.current.duration;

      // SYNC VIDEO: Ensure video is muted and synced to avoid double audio
      if (showVideoIframe && videoRef.current) {
        if (!videoRef.current.muted) videoRef.current.muted = true;
        if (Math.abs(videoRef.current.currentTime - currentTime) > 0.3) {
          videoRef.current.currentTime = currentTime;
        }
        if (isPlaying && videoRef.current.paused) {
          videoRef.current.play().catch(() => {});
        } else if (!isPlaying && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      }
      
      // Calculate smooth volume`;

// Replacing carefully:
const newContent = content.replace(/      const duration = audioRef\.current\.duration;\s*\/\/ Calculate smooth volume/, replacement);

fs.writeFileSync('src/App.tsx', newContent);
console.log(content === newContent ? 'NO CHANGE' : 'CHANGED');
