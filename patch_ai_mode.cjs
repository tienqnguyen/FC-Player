const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/useState<"webgpu" \| "onnx">\("webgpu"\)/, 'useState<"webgpu" | "onnx" | "ai">("webgpu")');
code = code.replace(/handleSeparateStems = async \(forceEngine\?\: "webgpu" \| "onnx"\)/, 'handleSeparateStems = async (forceEngine?: "webgpu" | "onnx" | "ai")');

const onnxBlock = `    } else if (activeEngine === "onnx") {`;
const aiBlock = `    } else if (activeEngine === "ai") {
      try {
        console.log("[AI Cloud] Sending to remote server for separation...");
        const formData = new FormData();
        formData.append("audioUrl", audioUrl);
        const res = await fetch("/api/stemmix", {
            method: "POST",
            body: formData
        });
        if (!res.ok) throw new Error("AI Cloud request failed");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        console.log("[AI Cloud] Stems successfully separated remotely!");
        setStemUrls({
            vocals: data.vocals,
            drums: data.drums,
            bass: data.bass,
            guitar: data.other, // Mapping 'other' to guitar since Demucs outputs 4 stems usually
            piano: data.other,
            other: data.other,
            isDspFallback: false
        } as any);
        setStemmixStatus("ready");
      } catch (err: any) {
         console.error("[AI Cloud error]", err);
         setStemmixError(err.message || "AI Cloud separation failed.");
         setStemmixStatus("error");
      }
    } else if (activeEngine === "onnx") {`;

code = code.replace(onnxBlock, aiBlock);

fs.writeFileSync('src/App.tsx', code);

// Now patch StemStudio.tsx
let code2 = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');
code2 = code2.replace(/separationMode\?\: "webgpu" \| "onnx"/g, 'separationMode?: "webgpu" | "onnx" | "ai"');
code2 = code2.replace(/onSetSeparationMode\?\: \(mode\: "webgpu" \| "onnx"\) => void/g, 'onSetSeparationMode?: (mode: "webgpu" | "onnx" | "ai") => void');

const onnxOption = `<button
                                  onClick={() => onSetSeparationMode?.("onnx")}
                                  className={\`w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest \${separationMode === "onnx" ? "bg-amber-400 text-black" : "text-white/60 hover:bg-white/5 hover:text-white"}\`}
                               >
                                  🧠 ONNX ML
                               </button>`;
const aiOption = `<button
                                  onClick={() => onSetSeparationMode?.("onnx")}
                                  className={\`w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest \${separationMode === "onnx" ? "bg-amber-400 text-black" : "text-white/60 hover:bg-white/5 hover:text-white"}\`}
                               >
                                  🧠 ONNX ML
                               </button>
                               <button
                                  onClick={() => onSetSeparationMode?.("ai")}
                                  className={\`w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest \${separationMode === "ai" ? "bg-amber-400 text-black" : "text-white/60 hover:bg-white/5 hover:text-white"}\`}
                               >
                                  🤖 AI Cloud
                               </button>`;
code2 = code2.replace(onnxOption, aiOption);

fs.writeFileSync('src/components/StemStudio.tsx', code2);
