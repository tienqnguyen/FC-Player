const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

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

const masterFxReplace = `
          {/* MASTER FX */}
          <div className="flex flex-col gap-3.5 border-t border-white/5 pt-4">
             <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
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

const panReplace = `
                               <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono">Track {stemsList.indexOf(stem) + 1}</span>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[8px] font-black text-white/30 uppercase w-2 text-right">L</span>
                                  <input
                                      type="range" min="-1" max="1" step="0.01" value={pans[stem] || 0}
                                      onChange={(e) => setPans(p => ({...p, [stem]: parseFloat(e.target.value)}))}
                                      className="w-20 h-1 rounded-full appearance-none bg-white/10 accent-white/50 hover:accent-white/80"
                                      title="Pan"
                                  />
                                  <span className="text-[8px] font-black text-white/30 uppercase w-2 text-left">R</span>
                               </div>
                            </div>
                         </div>`;
// Replace the exact lines of Track N and the closing tags
code = code.replace(/<span className="text-\[9px\] text-white\/40 uppercase tracking-widest font-mono">Track \{stemsList\.indexOf\(stem\) \+ 1\}<\/span>\s*<\/div>\s*<\/div>/g, panReplace);

fs.writeFileSync('src/components/StemStudio.tsx', code);
