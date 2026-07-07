const fs = require('fs');

let stemStudio = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');
stemStudio = stemStudio.replace(/separationMode\?\:\s*"webgpu"\s*\|\s*"ai"/g, 'separationMode?: "webgpu" | "onnx"');
stemStudio = stemStudio.replace(/onSetSeparationMode\?\:\s*\(mode\:\s*"webgpu"\s*\|\s*"ai"\)/g, 'onSetSeparationMode?: (mode: "webgpu" | "onnx")');
stemStudio = stemStudio.replace(/🤖 AI Cloud/g, '🧠 ONNX ML');
stemStudio = stemStudio.replace(/separationMode === "ai"/g, 'separationMode === "onnx"');
stemStudio = stemStudio.replace(/onSetSeparationMode\?\.\("ai"\)/g, 'onSetSeparationMode?.("onnx")');
stemStudio = stemStudio.replace(/AI Processing Stems.../g, 'ONNX Neural Net Processing...');
stemStudio = stemStudio.replace(/Extracting vocals, drums, bass, guitar, and instrumentals using advanced AI separation models\./g, 'Running ONNX Runtime Web via WASM/WebGPU to extract stems using neural network inference.');
fs.writeFileSync('src/components/StemStudio.tsx', stemStudio);

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');
appTsx = appTsx.replace(/separationMode, setSeparationMode\] = useState<"webgpu" \| "ai">/g, 'separationMode, setSeparationMode] = useState<"webgpu" | "onnx">');
appTsx = appTsx.replace(/forceEngine\?\:\s*"webgpu"\s*\|\s*"ai"/g, 'forceEngine?: "webgpu" | "onnx"');
appTsx = appTsx.replace(/activeEngine === "ai"/g, 'activeEngine === "onnx"');

fs.writeFileSync('src/App.tsx', appTsx);
