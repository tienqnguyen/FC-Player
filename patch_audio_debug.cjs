const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

code = code.replace(/audio\.onended = \(\) => \{\n\s+setIsPlaying\(false\);\n\s+\};/, `audio.onended = () => {
          setIsPlaying(false);
        };
        audio.oncanplay = () => console.log("[StemStudio] Audio can play:", stem, audio.src, "duration:", audio.duration);
        audio.onplay = () => console.log("[StemStudio] Audio play:", stem);
        audio.onerror = (e) => console.error("[StemStudio] Audio error:", stem, audio.error);`);

fs.writeFileSync('src/components/StemStudio.tsx', code);
