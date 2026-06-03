import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add Tuning Modal
const audioSearchStr = '        <audio\n          ref={audioRef}';
const tuningModal = `
        {/* Tuning Modal */}
        {showTuning && (
           <div className="absolute inset-0 z-[100] bg-[#0A0B10]/95 backdrop-blur-xl flex flex-col pt-12 pb-safe px-4" onTouchStart={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold tracking-widest uppercase">HD Engine Settings</h2>
                 <button onClick={() => setShowTuning(false)} className="bg-white/10 p-2 rounded-full"><ChevronDown className="w-6 h-6"/></button>
              </div>
              
              <div className="flex flex-col gap-6 overflow-y-auto mb-4 custom-scrollbar pb-10">
                 {/* HD Master Toggle */}
                 <div className="bg-[#12141D] p-4 rounded-3xl border border-white/5 flex justify-between items-center">
                    <div>
                       <h3 className="font-bold text-[16px] text-[#0A84FF] uppercase tracking-widest flex items-center gap-2"><Zap className="w-4 h-4"/> Master HD Engine</h3>
                       <p className="text-sm text-gray-500 mt-1">Enhance audio globally</p>
                    </div>
                    <button 
                          onClick={() => { resumeContext(); toggleSignatureSound(!isSignatureSound); }} 
                          className={\`relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full transition-colors \${isSignatureSound ? 'bg-[#0A84FF]' : 'bg-gray-600'}\`}
                       >
                          <span className={\`inline-block h-6 w-6 transform rounded-full bg-white transition-transform \${isSignatureSound ? 'translate-x-7' : 'translate-x-1'}\`} />
                    </button>
                 </div>

                 {/* Presets */}
                 <div>
                    <h3 className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-3 px-2">Presets</h3>
                    <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x">
                       {PRESETS.map((p) => (
                          <button 
                             key={p.id} 
                             onClick={() => applyPreset(p)} 
                             className={\`flex-shrink-0 w-[140px] p-4 rounded-2xl text-left transition-all snap-start active:scale-95 border \${activePresetId === p.id ? 'bg-[#181B26] border-[#0A84FF]/50 shadow-md' : 'bg-[#12141D] border-white/5'}\`}
                          >
                             <p className={\`font-bold text-[14px] truncate \${activePresetId === p.id ? 'text-[#0A84FF]' : 'text-white'}\`}>{p.name}</p>
                             <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{p.desc}</p>
                          </button>
                       ))}
                    </div>
                 </div>

                 {/* EQ */}
                 <div className="bg-[#12141D] p-4 rounded-3xl border border-white/5">
                    <h3 className="font-bold text-[14px] uppercase tracking-widest text-white mb-4">15-Band Equalizer</h3>
                    <div className="flex gap-2 items-center mb-6 overflow-x-auto pb-2">
                         {eqSettings.map((band, i) => (
                            <button key={i} onClick={() => setActiveBand(i)} className={\`flex-1 min-w-[40px] py-3 px-1 text-[11px] rounded-lg text-center font-bold tracking-wider transition-all \${activeBand === i ? 'bg-white text-black shadow-md' : 'bg-white/5 text-gray-500 hover:text-white'}\`}>
                              {band.name.replace('Hz','').replace('kHz','k')}
                            </button>
                         ))}
                       </div>

                       <div className="flex flex-col items-center gap-4 bg-[#0A0B10] p-8 rounded-3xl shadow-inner border border-white/5 relative">
                           <div className="text-[20px] font-bold text-white mb-4 capitalize flex items-center gap-2">
                               {eqSettings[activeBand] && \`\${eqSettings[activeBand].name} \`}
                               <span className="text-[#0A84FF]">{eqSettings[activeBand]?.g.toFixed(1)} dB</span>
                           </div>
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
                             className="w-full max-w-[280px] h-3 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#0A84FF]"
                           />
                       </div>
                 </div>
              </div>
           </div>
        )}

        <audio
          ref={audioRef}`;
content = content.replace(audioSearchStr, tuningModal);


// 2. Add button in controls section to open the modal
const controlsOld = `                <button 
                  onClick={() => {
                    const idx = recentSongs.findIndex(s => s.id === currentSong?.id);
                    if (idx !== -1) { 
                      playRecentSong(recentSongs[(idx + 1) % recentSongs.length]);
                    }
                  }}
                  className={\`p-2 text-gray-500 hover:text-white transition-all\`}
                  title="Next"
                >
                    <Repeat className="w-6 h-6" />
                </button>`;
const controlsNew = `                <button 
                  onClick={() => setShowTuning(true)}
                  className={\`flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-95 text-gray-500 hover:text-white\`}
                  title="EQ & Settings"
                >
                    <SlidersHorizontal className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-wider mt-1 opacity-70">EQ</span>
                </button>`;

content = content.replace(controlsOld, controlsNew);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Updated App.tsx with EQ Tuning modal!");
