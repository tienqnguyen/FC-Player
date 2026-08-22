const fs = require('fs');

let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf-8');

let target = `                                           <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
                                               <button
                                                   type="button"
                                                   onClick={handleResetSunoSystemDefault}
                                                   className="py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                                                   title="Reset to System Default (1.045x Speed, +6.5 Pitch, +6.5dB EQ)"
                                               >
                                                   <RotateCcw className="w-3 h-3" />
                                                   Default
                                               </button>
                                               <button
                                                   type="button"
                                                   onClick={handleResetSunoOriginal}
                                                   className="py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white/80 border border-white/15 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                                                   title="Reset to Original Audio (1.000x Speed, 0 Pitch, 0dB EQ)"
                                               >
                                                   <FileAudio className="w-3 h-3" />
                                                   Original
                                               </button>
                                           </div>`;

let replacement = `                                           <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
                                               <button
                                                   type="button"
                                                   onClick={() => handleApplySunoLevel(1)}
                                                   className="py-1.5 px-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                                                   title="Level 1: Light Bypass"
                                               >
                                                   LVL 1
                                               </button>
                                               <button
                                                   type="button"
                                                   onClick={() => handleApplySunoLevel(2)}
                                                   className="py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                                                   title="Level 2: Standard Bypass (Default)"
                                               >
                                                   LVL 2
                                               </button>
                                               <button
                                                   type="button"
                                                   onClick={() => handleApplySunoLevel(3)}
                                                   className="py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                                                   title="Level 3: Heavy Bypass + DSP"
                                               >
                                                   LVL 3
                                               </button>
                                               <button
                                                   type="button"
                                                   onClick={handleResetSunoOriginal}
                                                   className="py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white/80 border border-white/15 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                                                   title="Reset to Original Audio (1.000x Speed, 0 Pitch, 0dB EQ)"
                                               >
                                                   <FileAudio className="w-3 h-3" />
                                                   Orig
                                               </button>
                                           </div>`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/components/StemStudio.tsx', content);
    console.log("Success patch 1");
} else {
    console.log("Target not found 1");
}

let target2 = `                     <div className="flex items-center gap-2 pb-1 border-b border-white/10">
                         <button
                             type="button"
                             onClick={handleResetSunoSystemDefault}
                             className="flex-1 py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                             title="Reset to System Default (1.045x Speed, +6.5 Pitch, +6.5dB EQ)"
                         >
                             <RotateCcw className="w-3 h-3" />
                             Default
                         </button>
                         <button
                             type="button"
                             onClick={handleResetSunoOriginal}
                             className="flex-1 py-1.5 px-2 bg-white/10 hover:bg-white/20 text-white/80 border border-white/15 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                             title="Reset to Original Audio (1.000x Speed, 0 Pitch, 0dB EQ)"
                         >
                             <FileAudio className="w-3 h-3" />
                             Original
                         </button>
                     </div>`;

let replacement2 = `                     <div className="grid grid-cols-4 gap-1 pb-1 border-b border-white/10">
                         <button
                             type="button"
                             onClick={() => handleApplySunoLevel(1)}
                             className="py-1.5 px-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                             title="Level 1"
                         >
                             Lvl 1
                         </button>
                         <button
                             type="button"
                             onClick={() => handleApplySunoLevel(2)}
                             className="py-1.5 px-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                             title="Level 2"
                         >
                             Lvl 2
                         </button>
                         <button
                             type="button"
                             onClick={() => handleApplySunoLevel(3)}
                             className="py-1.5 px-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                             title="Level 3"
                         >
                             Lvl 3
                         </button>
                         <button
                             type="button"
                             onClick={handleResetSunoOriginal}
                             className="py-1.5 px-1 bg-white/10 hover:bg-white/20 text-white/80 border border-white/15 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                             title="Original"
                         >
                             Orig
                         </button>
                     </div>`;

if (content.includes(target2)) {
    content = content.replace(target2, replacement2);
    fs.writeFileSync('src/components/StemStudio.tsx', content);
    console.log("Success patch 2");
} else {
    console.log("Target not found 2");
}

