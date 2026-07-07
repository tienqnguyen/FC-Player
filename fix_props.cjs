const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

code = code.replace(/\{ url: string, color: string, audioRef: any \}/, '{ url: string, color: string, audioElement: HTMLMediaElement | null }');
fs.writeFileSync('src/components/StemStudio.tsx', code);
