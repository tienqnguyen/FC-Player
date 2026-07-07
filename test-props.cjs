const fs = require('fs');
const content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');
if (content.includes('originalAudioUrl')) {
  console.log('originalAudioUrl is in the file');
}
