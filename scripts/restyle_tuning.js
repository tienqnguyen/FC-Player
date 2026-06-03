import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const modalStart = `{/* Tuning Modal */}`;
const modalEnd = `        <audio
          ref={audioRef}`;

const startIndex = content.indexOf(modalStart);
const endIndex = content.indexOf(modalEnd);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find blocks", startIndex, endIndex);
  process.exit(1);
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
                
                <div className="flex flex-col gap-8 overflow-y-auto custom-scrollbar pb-10 flex-1 relative z-10 mx-[-8px] px-2">
                   {/* HD Master Toggle */}
                   <div 
                      className={\`p-6 rounded-[24px] border transition-all duration-500 flex justify-between items-center shadow-xl relative overflow-hidden \${isSignatureSound ? 'bg-gradient-to-br from-[#0A84FF]/20 to-[#0A84FF]/5 border-[#0A84FF]/30' : 'bg-gradient-to-br from-[#1A1D27] to-[#12141D] border-white/5 hover:border-white/10'}\`}
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

                   {/* Presets */}
                   <div>
                      <h3 className="text-[13px] font-black tracking-widest uppercase text-gray-500 mb-4 px-1">Studio Presets</h3>
                      <div className="grid grid-cols-2 gap-3">
                         {PRESETS.map((p) => (
                            <button 
                               key={p.id} 
                               onClick={() => applyPreset(p)} 
                               className={\`p-5 rounded-[20px] text-left transition-all duration-200 active:scale-[0.98] border shadow-lg relative overflow-hidden \${activePresetId === p.id ? 'bg-[#181B26] border-[#0A84FF] shadow-[0_0_15px_rgba(10,132,255,0.15)]' : 'bg-[#12141D]/80 border-white/5 hover:bg-[#1A1D27]'}\`}
                            >
                               {activePresetId === p.id && <div className="absolute inset-0 bg-gradient-to-br from-[#0A84FF]/10 to-transparent pointer-events-none" />}
                               <p className={\`font-black text-[15px] truncate relative z-10 tracking-tight \${activePresetId === p.id ? 'text-[#0A84FF]' : 'text-white'}\`}>{p.name}</p>
                               <p className="text-[13px] text-gray-400 mt-1.5 line-clamp-2 leading-relaxed relative z-10 font-medium">{p.desc}</p>
                            </button>
                         ))}
                      </div>
                   </div>

                   {/* EQ */}
                   <div className="bg-[#12141D]/80 p-6 rounded-[28px] border border-white/5 shadow-xl relative overflow-hidden">
                      <h3 className="font-black text-[13px] uppercase tracking-widest text-gray-500 mb-6 relative z-10">Parametric EQ</h3>
                      
                      <div className="flex gap-2 items-center mb-8 overflow-x-auto pb-4 custom-scrollbar px-1 relative z-10 mask-fade-edges">
                           {eqSettings.map((band, i) => (
                              <button 
                                key={i} 
                                onClick={() => setActiveBand(i)} 
                                className={\`flex-1 min-w-[52px] py-3 px-1 text-[13px] rounded-[14px] text-center font-bold tracking-wider transition-all shadow-sm border \${activeBand === i ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-[#1A1D27] text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'}\`}
                              >
                                {band.name.replace('Hz','').replace('kHz','k')}
                              </button>
                           ))}
                         </div>

                         <div className="flex flex-col items-center gap-6 bg-[#0A0B10] p-8 rounded-[24px] shadow-inner border border-black/50 relative z-10 py-10">
                             <div className="text-[28px] font-black text-white tracking-tight flex flex-col items-center gap-1.5">
                                 {eqSettings[activeBand] && <span className="text-gray-500 text-[13px] tracking-widest uppercase">{eqSettings[activeBand].name}</span>}
                                 <div className="text-[#0A84FF] drop-shadow-lg flex items-baseline gap-1.5">
                                      {eqSettings[activeBand]?.g > 0 ? '+' : ''}{eqSettings[activeBand]?.g.toFixed(1)} 
                                      <span className="text-[16px] text-[#0A84FF]/60 font-bold">dB</span>
                                 </div>
                             </div>
                             
                             <div className="w-full max-w-[280px] relative mt-4 mb-2">
                               <input
                                 type="range"
                                 min="-12"
                                 max="12"
                                 step="0.1"
                                 value={eqSettings[activeBand]?.g || 0}
                                 onChange={(e) => {
                                   const val = parseFloat(e.target.value);
                                   const newEq = [...eqSettings];
                                   newEq[activeBand].g = val;
                                   setEqSettings(newEq);
                                   updateEqNode?.(activeBand, "gain", val);
                                 }}
                                 className="w-full h-3 bg-[#1A1D27] rounded-full appearance-none cursor-pointer accent-[#0A84FF] shadow-inner focus:outline-none"
                                 style={{
                                   background: \`linear-gradient(to right, #0A84FF 0%, #0A84FF \${((eqSettings[activeBand]?.g || 0) + 12) / 24 * 100}%, #1A1D27 \${((eqSettings[activeBand]?.g || 0) + 12) / 24 * 100}%, #1A1D27 100%)\`
                                 }}
                               />
                               <div className="flex justify-between w-full mt-4 text-[11px] font-black tracking-wider text-gray-500">
                                  <span>-12 dB</span>
                                  <span>0</span>
                                  <span>+12 dB</span>
                               </div>
                             </div>
                         </div>
                   </div>
                </div>
              </div>
           </div>
        )}

        <audio
          ref={audioRef}`;

content = content.substring(0, startIndex) + newModal + content.substring(endIndex + modalEnd.length);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Updated App.tsx with restyled Tuning Modal");
