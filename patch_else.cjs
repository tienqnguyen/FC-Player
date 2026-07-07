const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
if (!appTsx.includes('import { separateStemsWithONNX }')) {
    appTsx = appTsx.replace(
        /import \{ separateStemsWithWebGpu, isWebGpuSupported \} from "\.\/utils\/webgpuDsp";/,
        `import { separateStemsWithWebGpu, isWebGpuSupported } from "./utils/webgpuDsp";\nimport { separateStemsWithONNX } from "./utils/onnxSeparation";`
    );
}

const targetStart = `} else {
      try {
        let res;`;

const targetEnd = `        } else {
           setStemmixError(err.message || "An error occurred during AI stem separation.");
           setStemmixStatus("error");
        }
      }
    }`;

// Let's use regex to replace everything from `} else {` to the end of the `if (activeEngine === "webgpu") { ... } else { ... }`
// The `handleSeparateStems` ends right after this block.

const newElseBlock = `} else if (activeEngine === "onnx") {
      try {
        console.log("[ONNX] Initializing ONNX Runtime Web session...");
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const decodedBuffer = await safeDecodeAudioData(ctx as any, arrayBuffer);
        
        console.log("[ONNX] Executing ONNX neural network inference...");
        const processedStems = await separateStemsWithONNX(decodedBuffer, ctx);
        
        console.log("[ONNX] Converting ONNX output tensors to playable WAV stems...");
        const stemUrlsObj: any = {};
        const keys = ["vocals", "bass", "drums", "melody", "other"] as const;
        for (const key of keys) {
          const buffer = processedStems[key];
          const wavBuffer = audioBufferToWav(buffer, { float32: true });
          const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
          const blobUrl = URL.createObjectURL(wavBlob);
          if (key === "melody") {
            stemUrlsObj.guitar = blobUrl;
            stemUrlsObj.piano = blobUrl;
          } else {
            stemUrlsObj[key] = blobUrl;
          }
        }
        console.log("[ONNX] Stems extracted successfully client-side!");
        setStemUrls(stemUrlsObj);
        setStemmixStatus("ready");
      } catch (err: any) {
        console.error(err);
        setStemmixError(err.message || "ONNX Separation failed. Try checking your browser's WebAssembly support.");
        setStemmixStatus("error");
      }
    }`;

appTsx = appTsx.replace(/\} else \{\s*try \{\s*let res;[\s\S]*?setStemmixStatus\("error"\);\s*\}\s*\}\s*\}/, newElseBlock);

fs.writeFileSync('src/App.tsx', appTsx);
