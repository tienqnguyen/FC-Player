const fs = require('fs');
let code = fs.readFileSync('src/utils/webgpuDsp.ts', 'utf8');

const regex = /stemsBuffers\[mode\]\.set\(new Float32Array\(arrayBuffer\)\);/g;
const replace = `
    const view = new Float32Array(arrayBuffer);
    let maxVal = 0;
    for (let j = 0; j < 10000 && j < view.length; j++) {
      if (Math.abs(view[j]) > maxVal) maxVal = Math.abs(view[j]);
    }
    console.log(\`[WebGPU] mode \${mode} max val (first 10k samples): \${maxVal}\`);
    stemsBuffers[mode].set(view);`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/utils/webgpuDsp.ts', code);
  console.log("Patched webgpuDsp.ts with logging.");
} else {
  console.log("Could not find regex match.");
}
