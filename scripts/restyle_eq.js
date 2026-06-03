import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const modalStart = `{/* Tuning Modal */}`;
const modalEnd = `        {/* Playlist */}`;

const startIndex = content.indexOf(modalStart);
let endIndex = content.indexOf(modalEnd);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find blocks", startIndex, endIndex);
  
  // also check for audio player end
  const altEnd = `<audio`;
  endIndex = content.lastIndexOf(altEnd, content.length - 150);
  if (endIndex === -1) {
      process.exit(1);
  }
}

const newModal = `{/* Tuning Modal */}
        {showTuning && (
           <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col pt-10 pb-10 px-6 items-center" onTouchStart={e => e.stopPropagation()}>
              <div className="w-full max-w-md flex flex-col h-full bg-[#0A0B10]/50 rounded-[32px] border border-white/5 shadow-2xl p-6 relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[40%] bg-[#0A84FF]/20 blur-[120px] pointer-events-none" />
                
                <div className="flex justify-between items-center mb-8 shrink-0 relative z-10">
                   <h2 className="text-[24px] font-black tracking-tight text-white flex items-center gap-3 drop-shadow-md">
                      <Zap className="w-7 h-7 text-[#0A84FF]" /> 
                      HD ENGINE
                   </h2>
                   <button onClick={() => setShowTuning(false)} className="bg-white/5 hover:bg-white/15 active:scale-90 p-3 rounded-full transition-all border border-white/5 shadow-xl">
                       <ChevronDown className="w-7 h-7 text-white/80"/>
                   </button>
                </div>
                
                <div className="flex flex-col gap-8 overflow-y-auto custom-scrollbar pb-10 flex-1 relative z-10 mx-[-8px] px-2 pt-2">
                   {/* HD Master Toggle */}
                   <div 
                      className={\`p-6 rounded-[24px] border transition-all duration-500 flex justify-between items-center shadow-xl relative overflow-hidden shrink-0 \${isSignatureSound ? 'bg-gradient-to-br from-[#0A84FF]/20 to-[#0A84FF]/5 border-[#0A84FF]/30' : 'bg-gradient-to-br from-[#1A1D27] to-[#12141D] border-white/5 hover:border-white/10'}\`}
                   >
                      <div className="relative z-10">
                         <h3 className="font-bold text-[18px] text-white tracking-tight flex items-center gap-2">
                             Master HD Audio
                         </h3>
                         <p className={\`text-[14px] mt-1 font-medium transition-colors \${isSignatureSound ? 'text-[#0A84FF]/80' : 'text-gray-500'}\`}>Bypass limits, upscale audio</p>
                      </div>
                      <button 
                            onClick={() => { resumeContext(); toggleSignatureSound(!isSignatureSound); }} 
                            className={\`relative inline-flex h-10 w-16 flex-shrink-0 items-center rounded-full transition-all duration-300 shadow-inner z-10 border border-black/30 \${isSignatureSound ? 'bg-[#0A84FF] shadow-[0_0_20px_rgba(10,132,255,0.4)]' : 'bg-[#0A0B10]'}\`}
                         >
                            <span className={\`inline-block h-8 w-8 transform rounded-full bg-white transition-transform duration-300 shadow-md \${isSignatureSound ? 'translate-x-8' : 'translate-x-1'}\`} />
                      </button>
                   </div>

                   {/* EQ */}
                   <div className="bg-[#12141D]/80 p-6 rounded-[28px] border border-white/5 shadow-xl relative overflow-hidden flex-1 flex flex-col min-h-0">
                      <div className="flex justify-between items-end mb-6 relative z-10 shrink-0">
                        <h3 className="font-black text-[13px] uppercase tracking-widest text-gray-500">Parametric EQ</h3>
                        <button 
                          onClick={() => {
                              const newEq = eqSettings.map((b) => ({ ...b, g: 0 }));
                              setEqSettings(newEq);
                              newEq.forEach((band, i) => updateEqNode?.(i, "gain", 0));
                          }}
                          className="text-[11px] font-bold text-[#0A84FF] uppercase tracking-wider hover:text-white transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                      
                      <div className="flex gap-4 items-center overflow-x-auto pb-6 custom-scrollbar px-1 relative z-10 flex-1 min-h-[250px] mask-fade-edges-x">
                           {eqSettings.map((band, i) => (
                              <div key={i} className="flex flex-col items-center justify-between h-full min-w-[48px] gap-4 py-2">
                                <div className="text-[10px] font-black text-[#0A84FF] tracking-wider bg-[#0A84FF]/10 px-1 py-1 rounded mb-2 flex items-center justify-center">
                                   {band.g > 0 ? '+' : ''}{band.g.toFixed(1)}
                                </div>
                                
                                <div className="flex-1 w-full flex justify-center relative py-4">
                                    <div className="absolute w-1.5 h-[160px] top-1/2 -translate-y-1/2 bg-[#1A1D27] rounded-full drop-shadow-inner border border-black/20" />
                                    <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 -translate-y-1/2" />
                                    <input
                                       type="range"
                                       min="-12"
                                       max="12"
                                       step="0.1"
                                       value={band.g || 0}
                                       onChange={(e) => {
                                         const val = parseFloat(e.target.value);
                                         const newEq = [...eqSettings];
                                         newEq[i].g = val;
                                         setEqSettings(newEq);
                                         updateEqNode?.(i, "gain", val);
                                       }}
                                       className="w-full h-full bg-transparent appearance-none cursor-pointer absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 !origin-center -rotate-90 slider-vertical"
                                       style={{ width: '160px', height: '48px' }}
                                    />
                                </div>

                                <div className="text-[11px] font-bold text-gray-500 tracking-wider mt-2">
                                   {band.name.replace('Hz','').replace('kHz','k')}
                                </div>
                              </div>
                           ))}
                         </div>
                   </div>
                </div>
              </div>
           </div>
        )}

        `;

content = content.substring(0, startIndex) + newModal + content.substring(endIndex);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Updated App.tsx with restyled EQ Modal");
