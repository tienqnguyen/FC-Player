const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const \[defaultPlaylistInput, setDefaultPlaylistInput\] = useState\(""\);/,
  `const [webgpuQuality, setWebgpuQuality] = useState<'fast' | 'high' | 'ultra' | 'pro'>(() => {
    return (localStorage.getItem("stemmix_webgpu_quality") as any) || "ultra";
  });
  const [defaultPlaylistInput, setDefaultPlaylistInput] = useState("");`
);

code = code.replace(
  /const webgpuQuality = \(localStorage\.getItem\("stemmix_webgpu_quality"\) \|\| "ultra"\) as 'fast' \| 'high' \| 'ultra' \| 'pro';/,
  ``
);

code = code.replace(
  /const processedStems = await separateStemsWithWebGpu\(decodedBuffer, ctx, undefined, webgpuQuality\);/,
  `const processedStems = await separateStemsWithWebGpu(decodedBuffer, ctx, undefined, webgpuQuality);`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx state for quality.");
