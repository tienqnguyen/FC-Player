const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

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
         // Pitch shifting is inherently changed by playbackRate in OfflineCtx.
         
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

const exportBtnsReplace = `<div className="flex gap-2">
             <button
                 onClick={handleExportMix}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all"
             >
                 <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                 <span className="text-[10px] font-black uppercase tracking-wider">Mixdown WAV</span>
             </button>
             <button
                 onClick={handleExportZip}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl transition-all"
             >
                 <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                 <span className="text-[10px] font-black uppercase tracking-wider">ZIP Stems</span>
             </button>
             <button onClick={() => setStemUrls(null)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors" title="Close Workspace">✕</button>
          </div>`;
code = code.replace(/<div className="flex gap-2">\s*<button\s*onClick=\{handleExportZip\}[\s\S]*?<\/div>/, exportBtnsReplace);

fs.writeFileSync('src/components/StemStudio.tsx', code);
