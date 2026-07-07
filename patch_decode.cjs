const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const safeDecodeStr = `
function safeDecodeAudioData(ctx: AudioContext, audioData: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    try {
      const promise = ctx.decodeAudioData(
        audioData,
        (buffer) => resolve(buffer),
        (err) => reject(err || new Error("decodeAudioData callback error"))
      );
      if (promise && typeof promise.catch === 'function') {
        promise.catch((err) => reject(err || new Error("decodeAudioData promise error")));
      }
    } catch (err) {
      reject(err);
    }
  });
}
`;

// Insert after imports
const importEnd = content.indexOf('const VISUALIZER_PALETTES');
content = content.slice(0, importEnd) + safeDecodeStr + '\n' + content.slice(importEnd);

content = content.replace(/await tempCtx\.decodeAudioData\(arrayBuffer\)/g, 'await safeDecodeAudioData(tempCtx as any, arrayBuffer)');
content = content.replace(/await ctx\.decodeAudioData\(arrayBuffer\)/g, 'await safeDecodeAudioData(ctx as any, arrayBuffer)');

fs.writeFileSync('src/App.tsx', content);
