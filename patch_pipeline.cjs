const fs = require('fs');
let content = fs.readFileSync('src/audioPipeline.ts', 'utf8');

const safeDecodeStr = `
function safeDecodeAudioData(ctx: BaseAudioContext, audioData: ArrayBuffer): Promise<AudioBuffer> {
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

const importEnd = content.indexOf('export const buildImpulseResponse');
content = content.slice(0, importEnd) + safeDecodeStr + '\n' + content.slice(importEnd);

content = content.replace(/await acts\.decodeAudioData\(audioData\)/g, 'await safeDecodeAudioData(acts, audioData)');

fs.writeFileSync('src/audioPipeline.ts', content);
