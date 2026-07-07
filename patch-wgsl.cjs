const fs = require('fs');
let code = fs.readFileSync('src/utils/webgpuDsp.ts', 'utf8');

const regex = /function getComputeShader[\s\S]*?\}\`\}\`\};/m;
code = code.replace(regex, "");

// Just find the end of it manually since it's messy now.
// Let's replace everything up to export async function separateStemsWithWebGpu
