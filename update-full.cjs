const fs = require('fs');

let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// 1. ADD TIMESTAMPS GENERATION
const transcriptLinesCode = `  const transcriptLines = useMemo(() => {
    if (!cohereTranscript) return [];
    
    // Attempt to split into logical segments (by sentence or punctuation)
    let segments = cohereTranscript.split('\\n').filter(s => s.trim().length > 0);
    if (segments.length === 1 && cohereTranscript.length > 50) {
      segments = cohereTranscript.match(/[^.!?]+[.!?]+/g) || [cohereTranscript];
    }
    
    // Split long segments further
    const finalSegments = [];
    for (const seg of segments) {
       const words = seg.split(/\\s+/).filter(w => w.length > 0);
       const wordsPerLine = 8;
       for (let i = 0; i < words.length; i += wordsPerLine) {
         finalSegments.push(words.slice(i, i + wordsPerLine).join(' '));
       }
    }

    const totalChars = finalSegments.reduce((acc, seg) => acc + seg.length, 0);
    let currTime = 0;
    return finalSegments.map(seg => {
       const ratio = seg.length / (totalChars || 1);
       const dur = ratio * (duration || 0);
       const start = currTime;
       const end = currTime + dur;
       currTime = end;
       return { text: seg.trim(), start, end };
    });
  }, [cohereTranscript, duration]);
`;
const idx = content.indexOf('const handlePlayPause');
content = content.slice(0, idx) + transcriptLinesCode + '\n  ' + content.slice(idx);


// 2. MIXER TOGGLE
content = content.replace(
  '<div className="flex items-center justify-between border-b border-white/5 pb-1.5">\n                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 uppercase"><Sliders className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Mixer</h3>\n                <span className="text-[9px] font-mono font-medium text-white/30">{stemsList.length} <span className="hidden sm:inline">Tracks Loaded</span></span>\n             </div>\n             \n             <div className="flex flex-col gap-2.5">',
  `<div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection('mixer')}>
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Sliders className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Mixer</h3>
                <div className="flex items-center gap-2">
                   <span className="text-[9px] font-mono font-medium text-white/30">{stemsList.length} <span className="hidden sm:inline">Tracks Loaded</span></span>
                   {expandedSections.mixer ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
                </div>
             </div>
             
             {expandedSections.mixer && (
             <div className="flex flex-col gap-2.5">`
);

// Close mixer div - right before SUBTITLES UI
content = content.replace(
  '          {/* SUBTITLES UI */}',
  `             )}
          </div>
          {/* SUBTITLES UI */}`
);

// Remove the opening <div className="flex flex-col gap-3"> for Mixer since we want the closing tag to be correct.
// Wait, the mixer section starts with:
/*
          {/* STEM VOLUMES MIXER * /}
          <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
*/
// We just added `)}</div>` right before `SUBTITLES UI`, which perfectly closes the conditional block.

// 3. SUBTITLES UI TOGGLE + HIGHLIGHTING
// We replace the subtitle UI area. We'll inject the whole new Subtitles UI.
const newSubtitlesUI = `          {/* SUBTITLES UI */}
          <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
             <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection('transcript')}>
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Type className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Vocal Transcript</h3>
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                       {cohereTranscript && !isEditingTranscript && (
                           <>
                               <button onClick={() => setIsEditingTranscript(true)} className="text-white/40 hover:text-white text-[10px] uppercase font-bold flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</button>
                               <button onClick={handleCopyTranscript} className="text-white/40 hover:text-white text-[10px] uppercase font-bold flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
                               <button onClick={handleExportSRT} className="text-amber-400/70 hover:text-amber-400 text-[10px] uppercase font-bold flex items-center gap-1"><FileText className="w-3 h-3" /> Export SRT</button>
                           </>
                       )}
                       {cohereTranscript && isEditingTranscript && (
                           <button onClick={() => setIsEditingTranscript(false)} className="text-amber-400 hover:text-amber-300 text-[10px] uppercase font-bold flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
                       )}
                       {isTranscribing && <span className="text-[9px] font-mono font-medium text-amber-400 animate-pulse">{transcriptionStatus}</span>}
                   </div>
                   {expandedSections.transcript ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
                </div>
             </div>
             
             {expandedSections.transcript && (
               <div className="flex flex-col gap-2.5">
                {cohereTranscript && isEditingTranscript && (
                    <textarea 
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white/90 text-sm leading-relaxed custom-scrollbar focus:outline-none focus:border-amber-400/50 min-h-[200px]"
                        value={cohereTranscript}
                        onChange={(e) => setCohereTranscript(e.target.value)}
                    />
                )}
                
                {cohereTranscript && !isEditingTranscript && (
                    <div className="bg-black/20 border border-white/5 p-4 rounded-xl flex flex-col gap-3 max-h-80 overflow-y-auto custom-scrollbar shadow-inner text-left scroll-smooth">
                        {transcriptLines.map((line, idx) => {
                           const isActive = currentTime >= line.start && currentTime < line.end;
                           const isPast = currentTime >= line.end;
                           return (
                             <p 
                               key={idx} 
                               className={\`text-sm leading-relaxed transition-colors duration-300 cursor-pointer flex gap-3 \${isActive ? 'text-amber-400 font-bold scale-[1.01] origin-left' : isPast ? 'text-white/60' : 'text-white/30'} hover:text-white\`}
                               onClick={() => handleSeek({ target: { value: line.start } })}
                             >
                               <span className="text-[9px] font-mono opacity-50 mt-1 shrink-0 w-12">
                                 {Math.floor(line.start / 60)}:{(Math.floor(line.start % 60)).toString().padStart(2, '0')}
                               </span>
                               <span>{line.text}</span>
                             </p>
                           );
                        })}
                    </div>
                )}
               </div>
             )}
          </div>`;

content = content.replace(/\{\/\* SUBTITLES UI \*\/\}[^]+?\{\/\* MASTER FX \*\/\}/, newSubtitlesUI + '\n          {/* MASTER FX */}');

// 4. MASTER FX TOGGLE
const oldFxHeader = `<div className="flex flex-col gap-3.5 border-t border-white/5 pt-4">
             <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 uppercase"><Settings2 className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Master FX</h3>
             </div>`;
             
const newFxHeader = `<div className="flex flex-col gap-3 border-t border-white/5 pt-4">
             <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection('masterFx')}>
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Settings2 className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Master FX</h3>
                {expandedSections.masterFx ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
             </div>
             {expandedSections.masterFx && (
               <div className="flex flex-col gap-3.5">`;
content = content.replace(oldFxHeader, newFxHeader);
content = content.replace(
  '          {/* EQUALIZER */}',
  `               </div>
             )}
          </div>
          {/* EQUALIZER */}`
);

// 5. MASTER EQ TOGGLE
const oldEqHeader = `<div className="flex flex-col gap-3.5 border-t border-white/5 pt-4">
             <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 uppercase"><Sliders className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Master EQ</h3>
                <div className="flex gap-2">
                   <button onClick={() => setEqBands(EQ_PRESETS.flat)} className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors">Reset</button>
                   <button onClick={() => setEqBands(EQ_PRESETS.bassBoost)} className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors">Bass</button>
                   <button onClick={() => setEqBands(EQ_PRESETS.air)} className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors">Air</button>
                </div>
             </div>`;
             
const newEqHeader = `<div className="flex flex-col gap-3 border-t border-white/5 pt-4">
             <div className="flex justify-between items-center border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection('masterEq')}>
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Sliders className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Master EQ</h3>
                <div className="flex gap-2 items-center">
                   <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                     <button onClick={() => setEqBands(EQ_PRESETS.flat)} className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors">Reset</button>
                     <button onClick={() => setEqBands(EQ_PRESETS.bassBoost)} className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors">Bass</button>
                     <button onClick={() => setEqBands(EQ_PRESETS.air)} className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors">Air</button>
                   </div>
                   {expandedSections.masterEq ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
                </div>
             </div>
             {expandedSections.masterEq && (
               <div className="flex flex-col gap-3.5">`;

content = content.replace(oldEqHeader, newEqHeader);
content = content.replace(
  '          {/* CUSTOM SERVER CONFIG / HF CLONE INSTRUCTIONS */}',
  `               </div>
             )}
          </div>
          {/* CUSTOM SERVER CONFIG / HF CLONE INSTRUCTIONS */}`
);

// 6. AI CLOUD SPACE TOGGLE
const oldCloudHeader = `<div className="flex flex-col gap-3.5 border-t border-white/5 pt-4">
             <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 uppercase flex items-center gap-1">
                   <Cloud className="w-3.5 h-3.5 text-amber-400" /> AI Cloud custom space
                </h3>
                <span className="text-[8px] bg-amber-400/10 border border-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded font-black font-mono">OPTIONAL</span>
             </div>`;
             
const newCloudHeader = `<div className="flex flex-col gap-3 border-t border-white/5 pt-4">
             <div className="flex justify-between items-center border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection('aiCloud')}>
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase flex items-center gap-1">
                   <Cloud className="w-3.5 h-3.5 text-amber-400" /> AI Cloud custom space
                </h3>
                <div className="flex items-center gap-2">
                   <span className="text-[8px] bg-amber-400/10 border border-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded font-black font-mono">OPTIONAL</span>
                   {expandedSections.aiCloud ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
                </div>
             </div>
             {expandedSections.aiCloud && (
               <div className="flex flex-col gap-3.5">`;

content = content.replace(oldCloudHeader, newCloudHeader);

// Close it at the end of the div
const oldCloudFooter = `             </div>
          </div>

        </div>`;
const newCloudFooter = `             </div>
               </div>
             )}
          </div>

        </div>`;
content = content.replace(oldCloudFooter, newCloudFooter);

fs.writeFileSync('src/components/StemStudio.tsx', content);
console.log('done!');
