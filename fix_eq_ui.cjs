const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf-8');

const eqUiStart = code.indexOf(`{/* Dynamic Content (Mixer Slider or EQ Sliders) */}`);
const eqUiEnd = code.indexOf(`{/* Mute / Solo */}`);

if (eqUiStart !== -1 && eqUiEnd !== -1) {
  const toReplace = code.substring(eqUiStart, eqUiEnd);
  const newUi = `{/* Dynamic Content (Mixer Slider) */}
                   <div className="flex-1 w-full flex flex-col items-center justify-between gap-2 h-[180px]">
                      <div className="text-[10px] font-mono font-bold" style={{ color: STEM_COLORS[stem] || '#fff' }}>
                         {Math.round(volumes[stem] * 100)}%
                      </div>
                      <div className="flex-1 w-full relative min-h-[140px] flex items-center justify-center">
                          <div className="absolute top-0 bottom-0 w-8 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                               <div className="absolute bottom-0 left-0 right-0 transition-all duration-75" style={{ height: \`\${volumes[stem] * 100}%\`, backgroundColor: STEM_COLORS[stem] || '#fff', opacity: 0.2 }} />
                          </div>
                          <input
                             type="range"
                             min="0" max="1" step="0.01"
                             value={volumes[stem]}
                             onChange={(e) => setVolumes(p => ({...p, [stem]: parseFloat(e.target.value)}))}
                             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 !origin-center -rotate-90 slider-vertical-glass appearance-none bg-transparent cursor-grab active:cursor-grabbing"
                             style={{ width: '140px', height: '32px' }}
                          />
                      </div>
                   </div>
                   `;
  code = code.replace(toReplace, newUi);
} else {
  console.log("Could not find dynamic content UI");
}

const stemListMapStart = code.indexOf(`{stemsList.map(stem => (`);
const stemListMapEnd = code.indexOf(`</div>\n       </div>`, stemListMapStart);

if (stemListMapStart !== -1 && stemListMapEnd !== -1) {
    const toReplace = code.substring(stemListMapStart, stemListMapEnd);
    const newUi = `{activeTab === 'mixer' ? (
             <>
             {stemsList.map(stem => (
                <div key={stem} className="shrink-0 w-[85px] bg-[#0A0A0C] border border-white/5 rounded-[20px] p-2 flex flex-col items-center gap-3 pb-3 group">
                   
                   {/* Name & Icon */}
                   <div className="flex flex-col items-center gap-2 mt-1">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/50 border border-white/5" style={{ color: STEM_COLORS[stem] || '#fff' }}>
                           {stem === 'vocals' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>}
                           {stem === 'drums' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>}
                           {stem === 'bass' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><path d="M6 15H3c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h3c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2Z"/><path d="M18 13h-3c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h3c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2Z"/></svg>}
                           {stem === 'guitar' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 8v8"/><path d="M12 8v8"/><path d="M16 8v8"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>}
                           {stem === 'piano' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M6 5v14"/><path d="M10 5v14"/><path d="M14 5v14"/><path d="M18 5v14"/></svg>}
                           {stem === 'other' && <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/50">{stem}</span>
                   </div>

                   {/* Dynamic Content (Mixer Slider) */}
                   <div className="flex-1 w-full flex flex-col items-center justify-between gap-2 h-[180px]">
                      <div className="text-[10px] font-mono font-bold" style={{ color: STEM_COLORS[stem] || '#fff' }}>
                         {Math.round(volumes[stem] * 100)}%
                      </div>
                      <div className="flex-1 w-full relative min-h-[140px] flex items-center justify-center">
                          <div className="absolute top-0 bottom-0 w-8 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                               <div className="absolute bottom-0 left-0 right-0 transition-all duration-75" style={{ height: \`\${volumes[stem] * 100}%\`, backgroundColor: STEM_COLORS[stem] || '#fff', opacity: 0.2 }} />
                          </div>
                          <input
                             type="range"
                             min="0" max="1" step="0.01"
                             value={volumes[stem]}
                             onChange={(e) => setVolumes(p => ({...p, [stem]: parseFloat(e.target.value)}))}
                             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 !origin-center -rotate-90 slider-vertical-glass appearance-none bg-transparent cursor-grab active:cursor-grabbing"
                             style={{ width: '140px', height: '32px' }}
                          />
                      </div>
                   </div>
                   
                   {/* Mute / Solo */}
                   <div className="flex flex-col gap-1.5 w-full mt-2">
                       <button
                           onClick={() => setMutes(p => ({...p, [stem]: !p[stem]}))}
                          className={\`w-full h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all border \${mutes[stem] ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'}\`}
                       >M</button>
                       <button
                           onClick={() => setSolos(p => ({...p, [stem]: !p[stem]}))}
                          className={\`w-full h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all border \${solos[stem] ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'}\`}
                       >S</button>
                   </div>
                </div>
             ))}
             </>
           ) : (
             <div className="flex-1 w-full flex flex-col relative z-10 px-2 animate-in fade-in slide-in-from-right-4 duration-500 min-w-max">
                <div className="flex justify-between items-end mb-6 shrink-0">
                  <h3 className="font-bold text-[12px] uppercase tracking-widest text-white/70">Equalizer</h3>
                  <button 
                     onClick={() => {
                        const newEq = masterEq.map((b) => ({ ...b, g: 0 }));
                        setMasterEq(newEq);
                     }}
                     className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/80 active:scale-95 transition-all"
                  >
                     Reset
                  </button>
                </div>
                
                {/* 15-Band EQ Grid */}
                <div className="flex-1 flex gap-2 sm:gap-4 overflow-x-auto overflow-y-hidden pb-4 items-center justify-start scrollbar-none" style={{ minWidth: "100%" }}>
                   {masterEq.map((band, i) => (
                      <div key={band.name + i} className="flex flex-col items-center justify-center gap-3 shrink-0 group min-w-[36px]">
                        <div className={\`text-[10px] font-mono font-bold tracking-widest h-4 flex items-center justify-center text-center transition-colors \${band.g !== 0 ? 'text-amber-400' : 'text-white/40'}\`}>
                           {band.g > 0 ? '+' : ''}{band.g.toFixed(1)}
                        </div>
                        <div className="relative w-8 h-[120px] flex items-center justify-center my-2">
                            {/* Track background */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px] bg-black/50 rounded-full border border-white/5 shadow-[inset_0_1px_3px_rgba(0,0,0,1)]" />
                            {/* Fill Indicator (active positive) */}
                            <div 
                              className="absolute left-1/2 -translate-x-1/2 bottom-1/2 w-[4px] rounded-full bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.5)] pointer-events-none transition-all duration-200"
                               style={{
                                 height: \`\${band.g > 0 ? (band.g / 12) * 50 : 0}%\`,
                                 bottom: '50%'
                              }}
                             />
                            {/* Fill Indicator (active negative) */}
                            <div 
                              className="absolute left-1/2 -translate-x-1/2 top-1/2 w-[4px] rounded-full bg-white/20 pointer-events-none transition-all duration-200"
                               style={{
                                 height: \`\${band.g < 0 ? Math.abs(band.g / 12) * 50 : 0}%\`,
                                 top: '50%'
                              }}
                             />
                            
                            <input
                               type="range"
                               min="-12"
                               max="12"
                               step="0.1"
                               value={band.g || 0}
                               onChange={(e) => {
                                 const val = parseFloat(e.target.value);
                                 const newEq = [...masterEq];
                                 newEq[i].g = val;
                                 setMasterEq(newEq);
                               }}
                               className="w-full h-full bg-transparent appearance-none cursor-grab active:cursor-grabbing absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 !origin-center -rotate-90 slider-vertical-glass"
                               style={{ width: '120px', height: '32px' }}
                            />
                        </div>
                        <div className={\`text-[10px] font-bold tracking-widest h-4 flex items-center justify-center text-center leading-tight transition-colors \${band.g !== 0 ? 'text-amber-400/80' : 'text-white/40'}\`}>
                           {band.name}
                        </div>
                      </div>
                   ))}
                </div>
             </div>
           )}
`;
    code = code.replace(toReplace, newUi);
} else {
    console.log("Could not find stemslist map");
}

fs.writeFileSync('src/components/StemStudio.tsx', code);
