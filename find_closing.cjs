const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');
let level = 0;
let started = false;
for (let i = 4300; i < lines.length; i++) {
  if (lines[i].includes('flex-1 overflow-hidden mt-3 pb-3')) {
    started = true;
    level = 1; // It opened on the PREVIOUS line!
    continue;
  }
  if (!started) continue;
  const opens = (lines[i].match(/<div/g) || []).length;
  const closes = (lines[i].match(/<\/div>/g) || []).length;
  level += opens - closes;
  if (level <= 0) {
    console.log('Playlist section ends at line', i + 1);
    break;
  }
}
