const fs = require('fs');
const content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('Audio Enhancer Plugin'));
if (idx !== -1) {
  console.log(lines.slice(Math.max(0, idx - 15), idx + 15).join('\n'));
}
