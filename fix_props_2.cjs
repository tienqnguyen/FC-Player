const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

code = code.replace(/function StemWaveform\(\{ url, color, audioRef \}\: \{ url\: string, color\: string, audioElement\: HTMLMediaElement \| null \}/, 'function StemWaveform({ url, color, audioElement }: { url: string, color: string, audioElement: HTMLMediaElement | null })');

fs.writeFileSync('src/components/StemStudio.tsx', code);
