const fs = require('fs');
let code = fs.readFileSync('src/utils/webgpuDsp.ts', 'utf8');

code = code.replace(
  /const DSP_COMPUTE_SHADER = `/,
  `function getComputeShader(quality: 'fast' | 'high' | 'ultra' | 'pro') {
    let num_taps = 255;
    let half_taps = 127;
    if (quality === 'high') {
        num_taps = 1023;
        half_taps = 511;
    } else if (quality === 'ultra') {
        num_taps = 4095;
        half_taps = 2047;
    } else if (quality === 'pro') {
        num_taps = 8191;
        half_taps = 4095;
    }

return \``
);

code = code.replace(
  /let num_taps: i32 = 4095;\n  let half_taps: i32 = 2047;/g,
  `let num_taps: i32 = \${num_taps};\n  let half_taps: i32 = \${half_taps};`
);

code = code.replace(
  /export async function separateStemsWithWebGpu\(\n  audioBuffer: AudioBuffer,\n  audioContext: AudioContext,\n  onProgress\?: \(progress: number\) => void\n\)/,
  `export async function separateStemsWithWebGpu(
  audioBuffer: AudioBuffer,
  audioContext: AudioContext,
  onProgress?: (progress: number) => void,
  quality: 'fast' | 'high' | 'ultra' | 'pro' = 'ultra'
)`
);

code = code.replace(
  /const shaderModule = device.createShaderModule\({\n    code: DSP_COMPUTE_SHADER\n  }\);/g,
  `const shaderModule = device.createShaderModule({
    code: getComputeShader(quality)
  });`
);

code = code.replace(
  /outputBuffer\[index\] = final_sample;\n\}`;/,
  `outputBuffer[index] = final_sample;
}\`;
}`
);

fs.writeFileSync('src/utils/webgpuDsp.ts', code);
console.log("Patched webgpuDsp.ts for dynamic quality.");
