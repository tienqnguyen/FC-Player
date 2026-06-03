import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const timeUpdateOldReg = /const handleTimeUpdate = \(\) => {[\s\S]*?};/;
const timeUpdateNew = `const handleTimeUpdate = () => {
    if (audioRef.current && !isNaN(audioRef.current.duration)) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      const p = (currentTime / duration) * 100;
      const progressPercent = isNaN(p) ? 0 : p;
      if (progressBarRef1.current) progressBarRef1.current.style.width = \`\${progressPercent}%\`;
      if (progressBarRef2.current) progressBarRef2.current.style.width = \`\${progressPercent}%\`;
      if (currentTimeRef.current) currentTimeRef.current.innerText = formatDurationDisplay(currentTime);
    }
  };`;

content = content.replace(timeUpdateOldReg, timeUpdateNew);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Updated handleTimeUpdate");
