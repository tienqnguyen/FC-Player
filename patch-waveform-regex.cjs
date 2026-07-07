const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const regex = /for\s*\(\s*let\s+i\s*=\s*0;\s*i\s*<\s*barCount;\s*i\+\+\s*\)\s*\{[\s\S]*?sCtx\.fill\(\);\s*\}/;

const replace = `for (let i = 0; i < barCount; i++) {
        const dataIdx = Math.floor((i / barCount) * (bufferLength * 0.5));
        let val = dataArray[dataIdx] / 255.0;

        if (isMuted || !isPlaying) {
          val = isPlaying && !isMuted ? 0.02 : (Math.max(0, Math.sin(i * 0.2 + Date.now() * 0.003)) * 0.05);
        }

        const barHeight = Math.max(3, val * h * 0.85);
        const x = i * barWidth + spacing / 2;
        const yTop = (h - barHeight) / 2;

        sCtx.beginPath();
        sCtx.fillStyle = isMuted ? 'rgba(255, 255, 255, 0.06)' : color;
        
        if (!isMuted && isPlaying) {
          sCtx.shadowBlur = val * 8;
          sCtx.shadowColor = color;
        } else {
          sCtx.shadowBlur = 0;
        }

        if (sCtx.roundRect) {
          sCtx.roundRect(x, yTop, barWidth - spacing, barHeight, 4);
        } else {
          sCtx.rect(x, yTop, barWidth - spacing, barHeight);
        }
        sCtx.fill();
      }`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/components/StemStudio.tsx', code);
  console.log("Waveform patched via regex.");
} else {
  console.log("Could not find regex match.");
}
