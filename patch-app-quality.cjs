const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const processedStems = await separateStemsWithWebGpu\(decodedBuffer, ctx\);/,
  `const webgpuQuality = (localStorage.getItem("stemmix_webgpu_quality") || "ultra") as 'fast' | 'high' | 'ultra' | 'pro';
        const processedStems = await separateStemsWithWebGpu(decodedBuffer, ctx, undefined, webgpuQuality);`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx for quality param.");
