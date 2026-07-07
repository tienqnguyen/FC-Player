const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const target = `      for (let i = 0; i < barCount; i++) {
        // Map bar index to time domain indices
        const dataIdx = Math.floor((i / barCount) * bufferLength);
        let val = (dataArray[dataIdx] - 128) / 128; // -1.0 to 1.0

        if (isMuted || !isPlaying) {
          // Subtle idle oscillation
          val = isPlaying && !isMuted ? 0.05 : (Math.sin(i * 0.2 + Date.now() * 0.003) * 0.04);
        }

        const barHeight = Math.max(3, Math.abs(val) * h * 0.9);
        const x = i * barWidth + spacing / 2;
        const yTop = (h - barHeight) / 2;
        const dotY = h / 2 + val * h * 0.45;

        sCtx.beginPath();
        sCtx.fillStyle = isMuted ? 'rgba(255, 255, 255, 0.06)' : color;
        
        if (!isMuted && isPlaying) {
          sCtx.shadowBlur = 6;
          sCtx.shadowColor = color;
        } else {
          sCtx.shadowBlur = 0;
        }

        sCtx.arc(x, dotY, 2.5, 0, Math.PI * 2);
        sCtx.fill();
      }`;

const replace = `      for (let i = 0; i < barCount; i++) {
        // Map bar index to frequency indices (focus on lower 50%)
        const dataIdx = Math.floor((i / barCount) * (bufferLength * 0.5));
        let val = dataArray[dataIdx] / 255.0; // 0.0 to 1.0

        if (isMuted || !isPlaying) {
          // Subtle idle oscillation
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

if (code.includes(target)) {
  code = code.replace(target, replace);
  fs.writeFileSync('src/components/StemStudio.tsx', code);
  console.log("Waveform patched.");
} else {
  console.log("Could not find target content.");
}
