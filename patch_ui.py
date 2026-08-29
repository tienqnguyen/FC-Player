import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

ui_old = """                   {/* Add Plugin Placeholder */}
               <div className="w-full bg-white/5 border border-white/5 border-dashed hover:border-white/20 rounded-2xl p-4 flex items-center justify-center cursor-pointer transition-colors group">
                  <div className="flex items-center gap-2 text-white/30 group-hover:text-white/60 transition-colors">
                         <Plus className="w-4 h-4" />
                         <span className="text-[10px] font-bold uppercase tracking-wider">Add Plugin</span>
                      </div>
                   </div>"""

ui_new = """                   {/* 8D Audio Plugin */}
                   <div 
                      className={`w-full ${active8D ? 'bg-pink-500/10 border-pink-500/40' : 'bg-white/5 border-white/10 hover:border-white/20'} border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors group`}
                      onClick={() => {
                        if (!initAttemptedRef.current) initAudio();
                        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
                        setActive8D(!active8D);
                      }}
                   >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${active8D ? 'bg-pink-500/20 text-pink-400' : 'bg-white/5 text-white/40'}`}>
                           <Headphones className="w-5 h-5" />
                        </div>
                        <div>
                           <h3 className="text-white text-sm font-bold tracking-wide flex items-center gap-2">
                              8D Audio
                              {active8D && <span className="text-[8px] bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Active</span>}
                           </h3>
                           <p className="text-white/50 text-[10px] uppercase font-semibold">Spatial Panner</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${active8D ? 'border-pink-500 bg-pink-500' : 'border-white/20'} flex items-center justify-center`}>
                        {active8D && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>
                   </div>

                   {/* Bass Booster Plugin */}
                   <div 
                      className={`w-full ${activeBassBoost ? 'bg-orange-500/10 border-orange-500/40' : 'bg-white/5 border-white/10 hover:border-white/20'} border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors group`}
                      onClick={() => {
                        if (!initAttemptedRef.current) initAudio();
                        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
                        setActiveBassBoost(!activeBassBoost);
                      }}
                   >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeBassBoost ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/40'}`}>
                           <Speaker className="w-5 h-5" />
                        </div>
                        <div>
                           <h3 className="text-white text-sm font-bold tracking-wide flex items-center gap-2">
                              Bass Booster
                              {activeBassBoost && <span className="text-[8px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Active</span>}
                           </h3>
                           <p className="text-white/50 text-[10px] uppercase font-semibold">Low Shelf EQ</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${activeBassBoost ? 'border-orange-500 bg-orange-500' : 'border-white/20'} flex items-center justify-center`}>
                        {activeBassBoost && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>
                   </div>

                   {/* Slowed + Reverb Plugin */}
                   <div 
                      className={`w-full ${activeSpeedFx === 'slowed' ? 'bg-blue-500/10 border-blue-500/40' : 'bg-white/5 border-white/10 hover:border-white/20'} border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors group`}
                      onClick={() => {
                        if (!initAttemptedRef.current) initAudio();
                        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
                        setActiveSpeedFx(activeSpeedFx === 'slowed' ? null : 'slowed');
                      }}
                   >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeSpeedFx === 'slowed' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40'}`}>
                           <Waves className="w-5 h-5" />
                        </div>
                        <div>
                           <h3 className="text-white text-sm font-bold tracking-wide flex items-center gap-2">
                              Slowed + Reverb
                              {activeSpeedFx === 'slowed' && <span className="text-[8px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Active</span>}
                           </h3>
                           <p className="text-white/50 text-[10px] uppercase font-semibold">Vaporwave Vibe</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${activeSpeedFx === 'slowed' ? 'border-blue-500 bg-blue-500' : 'border-white/20'} flex items-center justify-center`}>
                        {activeSpeedFx === 'slowed' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>
                   </div>

                   {/* Nightcore Plugin */}
                   <div 
                      className={`w-full ${activeSpeedFx === 'nightcore' ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-white/5 border-white/10 hover:border-white/20'} border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors group`}
                      onClick={() => {
                        if (!initAttemptedRef.current) initAudio();
                        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
                        setActiveSpeedFx(activeSpeedFx === 'nightcore' ? null : 'nightcore');
                      }}
                   >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeSpeedFx === 'nightcore' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                           <Zap className="w-5 h-5" />
                        </div>
                        <div>
                           <h3 className="text-white text-sm font-bold tracking-wide flex items-center gap-2">
                              Nightcore
                              {activeSpeedFx === 'nightcore' && <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Active</span>}
                           </h3>
                           <p className="text-white/50 text-[10px] uppercase font-semibold">Sped Up & Pitched</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${activeSpeedFx === 'nightcore' ? 'border-emerald-500 bg-emerald-500' : 'border-white/20'} flex items-center justify-center`}>
                        {activeSpeedFx === 'nightcore' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>
                   </div>

                   {/* 432 Hz Converter */}
                   <div 
                      className={`w-full ${activeSpeedFx === '432hz' ? 'bg-amber-500/10 border-amber-500/40' : 'bg-white/5 border-white/10 hover:border-white/20'} border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors group`}
                      onClick={() => {
                        if (!initAttemptedRef.current) initAudio();
                        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
                        setActiveSpeedFx(activeSpeedFx === '432hz' ? null : '432hz');
                      }}
                   >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeSpeedFx === '432hz' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/40'}`}>
                           <Heart className="w-5 h-5" />
                        </div>
                        <div>
                           <h3 className="text-white text-sm font-bold tracking-wide flex items-center gap-2">
                              432 Hz Converter
                              {activeSpeedFx === '432hz' && <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Active</span>}
                           </h3>
                           <p className="text-white/50 text-[10px] uppercase font-semibold">Healing Frequency</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${activeSpeedFx === '432hz' ? 'border-amber-500 bg-amber-500' : 'border-white/20'} flex items-center justify-center`}>
                        {activeSpeedFx === '432hz' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>
                   </div>"""
content = content.replace(ui_old, ui_new)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
print("Patched UI")
