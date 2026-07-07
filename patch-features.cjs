const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// 1. Add JSZip import
code = code.replace(/import \{ Play, Pause/g, "import JSZip from 'jszip';\nimport { Play, Pause");

// 2. Add State for Panning and Speed
code = code.replace(
  /const \[mutes, setMutes\] = useState<Record<string, boolean>>\(\{\}\);/,
  `const [mutes, setMutes] = useState<Record<string, boolean>>({});
  const [pans, setPans] = useState<Record<string, number>>({});
  const [speed, setSpeed] = useState<number>(1);
  const [reverb, setReverb] = useState<number>(0);
  const pannerNodesRef = useRef<Record<string, StereoPannerNode>>({});
  const convolverRef = useRef<ConvolverNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);`
);

// 3. Update AudioContext setup to include Reverb and Panners
const audioInitRegex = /const master = ctx\.createGain\(\);\s*masterGainRef\.current = master;/;
const audioInitReplace = `const master = ctx.createGain();
      masterGainRef.current = master;

      // Create Reverb Impulse Response
      const sampleRate = ctx.sampleRate;
      const length = sampleRate * 2.5; // 2.5s reverb
      const impulse = ctx.createBuffer(2, length, sampleRate);
      const impulseL = impulse.getChannelData(0);
      const impulseR = impulse.getChannelData(1);
      for (let i = 0; i < length; i++) {
        const decay = Math.exp(-i / (sampleRate * 0.3));
        impulseL[i] = (Math.random() * 2 - 1) * decay;
        impulseR[i] = (Math.random() * 2 - 1) * decay;
      }
      const convolver = ctx.createConvolver();
      convolver.buffer = impulse;
      convolverRef.current = convolver;
      
      const revGain = ctx.createGain();
      revGain.gain.value = reverb;
      reverbGainRef.current = revGain;

      master.connect(convolver);
      convolver.connect(revGain);
      // revGain connects to eq chain later
      `;
code = code.replace(audioInitRegex, audioInitReplace);

const audioConnectRegex = /lastNode\.connect\(ctx\.destination\);/;
const audioConnectReplace = `lastNode.connect(ctx.destination);
      revGain.connect(eqNodes[0]); // parallel reverb into EQ`;
code = code.replace(audioConnectRegex, audioConnectReplace);

const stemConnectRegex = /const gain = ctx\.createGain\(\);\s*gainNodesRef\.current\[stem\] = gain;/;
const stemConnectReplace = `const gain = ctx.createGain();
        gainNodesRef.current[stem] = gain;
        
        const panner = ctx.createStereoPanner();
        panner.pan.value = pans[stem] || 0;
        pannerNodesRef.current[stem] = panner;`;
code = code.replace(stemConnectRegex, stemConnectReplace);

const nodeRoutingRegex = /audioNode\.connect\(analyser\);\s*analyser\.connect\(gain\);\s*gain\.connect\(master\);/;
const nodeRoutingReplace = `audioNode.connect(analyser);
        analyser.connect(panner);
        panner.connect(gain);
        gain.connect(master);`;
code = code.replace(nodeRoutingRegex, nodeRoutingReplace);

// 4. Handle Speed and Reverb changes
const effectChanges = `
  useEffect(() => {
    stemsList.forEach(stem => {
       const audio = audioElementsRef.current[stem];
       if (audio) {
         audio.playbackRate = speed;
         // Required for some browsers to prevent pitch shift, but we'll let it be.
         if ('preservesPitch' in audio) {
            (audio as any).preservesPitch = true;
         }
       }
    });
  }, [speed]);

  useEffect(() => {
    if (reverbGainRef.current) {
       reverbGainRef.current.gain.setTargetAtTime(reverb, audioContextRef.current!.currentTime, 0.1);
    }
  }, [reverb]);

  useEffect(() => {
    stemsList.forEach(stem => {
      const panner = pannerNodesRef.current[stem];
      if (panner) {
        panner.pan.setTargetAtTime(pans[stem] || 0, audioContextRef.current!.currentTime, 0.1);
      }
    });
  }, [pans]);
`;
code = code.replace(/useEffect\(\(\) => \{\s*if \(\!audioContextRef\.current\) return;\s*stemsList\.forEach\(stem => \{\s*const gain = gainNodesRef\.current\[stem\];/, effectChanges + "\n  useEffect(() => {\n    if (!audioContextRef.current) return;\n    stemsList.forEach(stem => {\n      const gain = gainNodesRef.current[stem];");


// 5. ZIP Export Function
const exportFunc = `
  const handleExportZip = async () => {
    try {
      const zip = new JSZip();
      for (const stem of stemsList) {
        const url = (stemUrls as any)[stem];
        if (url) {
           const res = await fetch(url);
           const blob = await res.blob();
           zip.file(\`\${stem}.wav\`, blob);
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      const dlUrl = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = "separated_stems.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
    } catch (e) {
      console.error("ZIP Export failed", e);
      alert("ZIP Export failed. Check console.");
    }
  };
`;
code = code.replace(/const togglePlay = \(\) => \{/, exportFunc + "\n  const togglePlay = () => {");


// 6. UI Updates
// Add ZIP Button
const exportBtnReplace = `<div className="flex gap-2">
             <button
                 onClick={handleExportZip}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl transition-all"
             >
                 <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                 <span className="text-[10px] font-black uppercase tracking-wider">ZIP Stems</span>
             </button>
             <button onClick={() => setStemUrls(null)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors" title="Close Workspace">✕</button>
          </div>`;
code = code.replace(/<button onClick=\{\(\) => setStemUrls\(null\)\}.*?<\/button>/, exportBtnReplace);

// Add Speed & Reverb Master Controls next to Master EQ
const masterFxReplace = `
          {/* MASTER FX */}
          <div className="flex flex-col gap-3.5 border-t border-white/5 pt-4">
             <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 uppercase">Master Effects</h3>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 border border-white/5 p-3 rounded-xl flex flex-col gap-2">
                   <div className="flex justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Tempo / Speed</span>
                      <span className="text-[10px] font-mono text-white/70">{speed.toFixed(2)}x</span>
                   </div>
                   <input
                       type="range" min="0.5" max="2" step="0.05" value={speed}
                       onChange={(e) => setSpeed(parseFloat(e.target.value))}
                       className="w-full h-1.5 rounded-lg appearance-none bg-white/10 accent-amber-400"
                   />
                </div>
                <div className="bg-black/20 border border-white/5 p-3 rounded-xl flex flex-col gap-2">
                   <div className="flex justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">Space (Reverb)</span>
                      <span className="text-[10px] font-mono text-white/70">{Math.round(reverb * 100)}%</span>
                   </div>
                   <input
                       type="range" min="0" max="1" step="0.01" value={reverb}
                       onChange={(e) => setReverb(parseFloat(e.target.value))}
                       className="w-full h-1.5 rounded-lg appearance-none bg-white/10 accent-purple-400"
                   />
                </div>
             </div>
          </div>
          {/* EQUALIZER */}`;
code = code.replace(/\{\/\* EQUALIZER \*\/\}/, masterFxReplace);


// Add Panning Slider in the Stem row
const panReplace = `<div className="flex items-center gap-2">
                           <span className="text-[8px] font-black text-white/30 uppercase w-4 text-right">L</span>
                           <input
                               type="range" min="-1" max="1" step="0.01" value={pans[stem] || 0}
                               onChange={(e) => setPans(p => ({...p, [stem]: parseFloat(e.target.value)}))}
                               className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-white/50 hover:accent-white/80"
                               title="Pan"
                           />
                           <span className="text-[8px] font-black text-white/30 uppercase w-4 text-left">R</span>
                        </div>
                     </div>`;
code = code.replace(/<span className="text-\[9px\] text-white\/40 uppercase tracking-widest font-mono">Track \{stemsList\.indexOf\(stem\) \+ 1\}<\/span>\s*<\/div>\s*<\/div>/g, 
  `<span className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Track {stemsList.indexOf(stem) + 1}</span>\n` + panReplace);

fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Patched StemStudio.tsx with Pro Features.");
