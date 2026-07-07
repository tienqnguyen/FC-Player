const fs = require('fs');
let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const safeDecodeStr = `
function safeDecodeAudioData(ctx: any, audioData: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    try {
      const promise = ctx.decodeAudioData(
        audioData,
        (buffer: any) => resolve(buffer),
        (err: any) => reject(err || new Error("decodeAudioData callback error"))
      );
      if (promise && typeof promise.catch === 'function') {
        promise.catch((err: any) => reject(err || new Error("decodeAudioData promise error")));
      }
    } catch (err) {
      reject(err);
    }
  });
}
`;

const importEnd = content.indexOf('export default function StemStudio');
content = content.slice(0, importEnd) + safeDecodeStr + '\n' + content.slice(importEnd);

content = content.replace(/await acts\.decodeAudioData\(buf\)/g, 'await safeDecodeAudioData(acts, buf)');

fs.writeFileSync('src/components/StemStudio.tsx', content);
