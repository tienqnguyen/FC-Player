const fs = require('fs');

let code = fs.readFileSync('/tmp/StemStudio_now.tsx', 'utf8');

// 1. WAVEFORM COMPONENT
if (!code.includes('import WaveSurfer from')) {
    code = code.replace(
        /import React, \{ useState, useEffect, useRef \} from "react";/,
        `import React, { useState, useEffect, useRef } from "react";\nimport WaveSurfer from "wavesurfer.js";`
    );
}

const waveformComp = `
function StemWaveform({ url, color, audioRef }: { url: string, color: string, audioRef: any }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WaveSurfer | null>(null);

    useEffect(() => {
        if (!containerRef.current || !url) return;
        wsRef.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: color,
            progressColor: 'rgba(255,255,255,0.5)',
            url,
            media: audioRef.current,
            height: 'auto',
            barWidth: 2,
            barGap: 2,
            barRadius: 2,
            interact: false
        });
        return () => wsRef.current?.destroy();
    }, [url, color, audioRef]);

    return <div ref={containerRef} className="w-full h-full opacity-60 hover:opacity-100 transition-opacity absolute inset-0 mix-blend-screen" />;
}
`;
code = code.replace(/export default function StemStudio/, waveformComp + '\nexport default function StemStudio');

// Safely replace the stem canvas
const stemCanvasRegex = /<canvas\s+ref=\{\(el\) => \{\s+if \(el\) \{\s+stemCanvasRefs\.current\[stem\] = el;\s+\} else \{\s+delete stemCanvasRefs\.current\[stem\];\s+\}\s+\}\}\s+width=\{500\}\s+height=\{80\}\s+className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"\s+\/>/g;
const stemCanvasReplace = `<canvas
                            ref={(el) => {
                              if (el) {
                                stemCanvasRefs.current[stem] = el;
                              } else {
                                delete stemCanvasRefs.current[stem];
                              }
                            }}
                            width={500}
                            height={80}
                            className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity z-10 relative pointer-events-none"
                         />
                         <StemWaveform url={(stemUrls as any)[stem]} color={STEM_COLORS[stem] || '#fbbf24'} audioRef={{ current: audioElementsRef.current[stem] }} />`;
code = code.replace(stemCanvasRegex, stemCanvasReplace);


// 2. PITCH SHIFT
if (!code.includes('const [preservePitch')) {
  code = code.replace(
    /const \[speed, setSpeed\] = useState<number>\(1\);/,
    `const [speed, setSpeed] = useState<number>(1);
  const [preservePitch, setPreservePitch] = useState<boolean>(true);`
  );
}

code = code.replace(
  /if \('preservesPitch' in audio\) \{\s*\(audio as any\)\.preservesPitch = true;\s*\}/,
  `if ('preservesPitch' in audio) {
            (audio as any).preservesPitch = preservePitch;
         }`
);
code = code.replace(/\[speed, stemsList\]/, `[speed, preservePitch, stemsList]`);

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


// 3. MIXDOWN EXPORT
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
      offlineRevGain.connect(offlineCtx.destination); 

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
         gain.gain.value = mutes[stem] ? 0 : (Object.values(solos).some(v=>v) ? (solos[stem] ? volumes[stem] : 0) : volumes[stem]);
         
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


// Remove old handleExportMix (the duplicate starting at ~line 750)
const oldExportStart = code.indexOf('const handleExportMix = async (format: "wav" | "mp3" = "wav") => {');
if (oldExportStart !== -1) {
    let braceCount = 0;
    let foundBrace = false;
    let oldExportEnd = -1;
    for (let i = oldExportStart; i < code.length; i++) {
        if (code[i] === '{') {
            braceCount++;
            foundBrace = true;
        } else if (code[i] === '}') {
            braceCount--;
        }
        if (foundBrace && braceCount === 0) {
            oldExportEnd = i + 1;
            break;
        }
    }
    if (oldExportEnd !== -1) {
        while(code[oldExportEnd] === ';' || code[oldExportEnd] === '\n') {
           oldExportEnd++;
        }
        code = code.slice(0, oldExportStart) + code.slice(oldExportEnd);
    }
}

// Add the new mixdown buttons (the previous agent's regex failed, so we'll match something easier in the header)
// Looking for the "Close" button.
const oldHeaderButtons = /<button onClick=\{\(\) => setStemUrls\(null\)\} className="w-8 h-8 rounded-full bg-white\/5 hover:bg-white\/10 flex items-center justify-center text-white\/50 hover:text-white transition-colors" title="Close Workspace">✕<\/button>/;
const newHeaderButtons = `<button
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
             <button onClick={() => { onClose(); setStemUrls(null); }} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors" title="Close Workspace">✕</button>`;

code = code.replace(oldHeaderButtons, newHeaderButtons);

// 4. ONNX RENAME
code = code.replace(/separationMode\?\:\s*"webgpu"\s*\|\s*"ai"/g, 'separationMode?: "webgpu" | "onnx"');
code = code.replace(/onSetSeparationMode\?\:\s*\(mode\:\s*"webgpu"\s*\|\s*"ai"\)\s*=>\s*void/g, 'onSetSeparationMode?: (mode: "webgpu" | "onnx") => void');
code = code.replace(/🤖 AI Cloud/g, '🧠 ONNX ML');
code = code.replace(/separationMode === "ai"/g, 'separationMode === "onnx"');
code = code.replace(/onSetSeparationMode\?\.\("ai"\)/g, 'onSetSeparationMode?.("onnx")');
code = code.replace(/AI Processing Stems.../g, 'ONNX Neural Net Processing...');
code = code.replace(/Extracting vocals, drums, bass, guitar, and instrumentals using advanced AI separation models\./g, 'Running ONNX Runtime Web via WASM/WebGPU to extract stems using neural network inference.');

fs.writeFileSync('src/components/StemStudio.tsx', code);
