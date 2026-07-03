const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = code.split('\n');
let openCount = 0;
let started = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('return (')) started = true;
  if (!started) continue;
  
  // This is naive, just for a quick check.
  const opens = (lines[i].match(/<div/g) || []).length;
  const closes = (lines[i].match(/<\/div>/g) || []).length;
  openCount += opens - closes;
  
  if (started && openCount === 0 && i > 3880) {
    console.log('Root element closed at line:', i + 1);
    break;
  }
}
