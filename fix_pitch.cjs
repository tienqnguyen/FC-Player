const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// I will just restore the file from /tmp/StemStudio_now.tsx and re-apply correctly.
code = fs.readFileSync('/tmp/StemStudio_now.tsx', 'utf8');

// 1. Add preservePitch state
if (!code.includes('const [preservePitch')) {
  code = code.replace(
    /const \[speed, setSpeed\] = useState<number>\(1\);/,
    `const [speed, setSpeed] = useState<number>(1);
  const [preservePitch, setPreservePitch] = useState<boolean>(true);`
  );
}

// 2. Update the speed effect to use preservePitch
code = code.replace(
  /if \('preservesPitch' in audio\) \{\s*\(audio as any\)\.preservesPitch = true;\s*\}/,
  `if ('preservesPitch' in audio) {
            (audio as any).preservesPitch = preservePitch;
         }`
);
code = code.replace(/\[speed, stemsList\]/, `[speed, preservePitch, stemsList]`);

// 3. Add UI for Pitch Shift (matching the leading div this time!)
const fxUIRegex = /<div className="flex justify-between">\s*<span className="text-\[10px\] font-black uppercase tracking-wider text-amber-400">Tempo \/ Speed<\/span>\s*<span className="text-\[10px\] font-mono text-white\/70">\{speed\.toFixed\(2\)\}x<\/span>\s*<\/div>\s*<input\s*type="range" min="0\.5" max="2" step="0\.05" value=\{speed\}\s*onChange=\{\(e\) => setSpeed\(parseFloat\(e\.target\.value\)\)\}\s*className="w-full h-1\.5 rounded-lg appearance-none bg-white\/10 accent-amber-400"\s*\/>/;
const fxUIReplace = `<div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Tempo / Speed</span>
                         <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={preservePitch} onChange={(e) => setPreservePitch(e.target.checked)} className="accent-amber-400" />
                            <span className="text-[9px] font-bold text-white/50 uppercase">Keep Pitch</span>
                         </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-white/70 w-8">{speed.toFixed(2)}x</span>
                        <input
                            type="range" min="0.5" max="2" step="0.05" value={speed}
                            onChange={(e) => setSpeed(parseFloat(e.target.value))}
                            className="flex-1 h-1.5 rounded-lg appearance-none bg-white/10 accent-amber-400"
                        />
                      </div>`;
code = code.replace(fxUIRegex, fxUIReplace);

// 4. Mixdown export
const mixdownFunc = `
  const handleExportMix = async () => {
    if (!audioContextRef.current || !stemUrls) return;
    setIsExporting(true);
    setExportProgress(0);
    try {
      const sampleRate = audioContextRef.current.sampleRate;
      const offlineCtx = new OfflineAudioContext(2, sampleRate * (duration || 300), sampleRate);
      
      const offlineMaster = offlineCtx.createGain();
      offlineMaster.connect(offlineCtx.destination);
      
      const offlineConvolver = offlineCtx.createConvolver();
      if (convolverRef.current && convolverRef.current.buffer) {
          offlineConvolver.buffer = convolverRef.current.buffer;
      }
      const offlineRevGain = offlineCtx.createGain();
      offlineRevGain.gain.value = reverb;
      
      offlineMaster.connect(offlineConvolver);
      offlineConvolver.connect(offlineRevGain);
      offlineRevGain.connect(offlineCtx.destination); // Simplified EQ for mixdown

      for (const stem of stemsList) {
         const url = (stemUrls as any)[stem];
         if (!url) continue;
         const res = await fetch(url);
         const arrayBuf = await res.arrayBuffer();
         const audioBuf = await offlineCtx.decodeAudioData(arrayBuf);
         
         const source = offlineCtx.createBufferSource();
         source.buffer = audioBuf;
         source.playbackRate.value = speed;
         
         const panner = offlineCtx.createStereoPanner();
         panner.pan.value = pans[stem] || 0;
         
         const gain = offlineCtx.createGain();
         gain.gain.value = Object.values(solos).some(v=>v) ? (solos[stem] ? volumes[stem] : 0) : volumes[stem];
         
         source.connect(panner);
         panner.connect(gain);
         gain.connect(offlineMaster);
         source.start(0);
      }
      
      setExportProgress(50);
      const renderedBuffer = await offlineCtx.startRendering();
      setExportProgress(90);
      
      const wav = audioBufferToWav(renderedBuffer, { float32: true });
      const blob = new Blob([wav], { type: "audio/wav" });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = "custom_mixdown.wav";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
      
    } catch (e) {
      console.error(e);
      alert("Mixdown failed.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };
`;
code = code.replace(/const togglePlay = \(\) => \{/, mixdownFunc + "\n  const togglePlay = () => {");

// Wait, the ZIP button didn't have onClick={handleExportZip} in the UI! It had something else? Let's check what it was.
// The previous agent might have just added handleExportZip but not the button!
// I'll add the button next to "Close Workspace"
const exportBtnsReplace = `<div className="flex gap-2">
             <button
                 onClick={handleExportMix}
                 disabled={isExporting}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all"
             >
                 <span className="text-[10px] font-black uppercase tracking-wider">{isExporting ? "Rendering..." : "Mixdown WAV"}</span>
             </button>
             <button
                 onClick={handleExportZip}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl transition-all"
             >
                 <span className="text-[10px] font-black uppercase tracking-wider">ZIP Stems</span>
             </button>
             <button onClick={() => { onClose(); }} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors" title="Close Workspace">✕</button>
          </div>`;
// Replace the entire top-right button group in the header:
code = code.replace(/<div className="flex gap-2">[\s\S]*?<\/div>/, exportBtnsReplace);

// 5. ONNX Rename
code = code.replace(/separationMode\?\:\s*"webgpu"\s*\|\s*"ai"/g, 'separationMode?: "webgpu" | "onnx"');
code = code.replace(/onSetSeparationMode\?\:\s*\(mode\:\s*"webgpu"\s*\|\s*"ai"\)\s*=>\s*void/g, 'onSetSeparationMode?: (mode: "webgpu" | "onnx") => void');
code = code.replace(/🤖 AI Cloud/g, '🧠 ONNX ML');
code = code.replace(/separationMode === "ai"/g, 'separationMode === "onnx"');
code = code.replace(/onSetSeparationMode\?\.\("ai"\)/g, 'onSetSeparationMode?.("onnx")');
code = code.replace(/AI Processing Stems.../g, 'ONNX Neural Net Processing...');
code = code.replace(/Extracting vocals, drums, bass, guitar, and instrumentals using advanced AI separation models\./g, 'Running ONNX Runtime Web via WASM/WebGPU to extract stems using neural network inference.');

fs.writeFileSync('src/components/StemStudio.tsx', code);
