import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# 1. Update the props passed to the plugins at the bottom (around line 6280)
old_plugins_bottom = """       <AudioEnhancer 
         isOpen={showAudioEnhancer}
         onClose={() => setShowAudioEnhancer(false)} 
         audioCtx={audioContextRef.current}
         inputNode={masterPluginInputRef.current}
         outputNode={masterPluginOutputRef.current}
       />
       <FcOneKnobPro 
         isOpen={showFcOneKnobPro}
         onClose={() => setShowFcOneKnobPro(false)} 
         audioCtx={audioContextRef.current}
         inputNode={masterPluginInputRef.current}
         outputNode={masterPluginOutputRef.current}
       />
       <FcStudioFx 
         isOpen={showFcStudioFx}
         onClose={() => setShowFcStudioFx(false)} 
         audioCtx={audioContextRef.current}
         inputNode={masterPluginInputRef.current}
         outputNode={masterPluginOutputRef.current}
       />"""

new_plugins_bottom = """       <AudioEnhancer 
         isOpen={showAudioEnhancer}
         onClose={() => setShowAudioEnhancer(false)} 
         audioCtx={audioContextRef.current}
         inputNode={masterPluginInputRef.current}
         outputNode={masterPluginOutputRef.current}
         isBypassed={fcAudioBypassed}
         onBypassChange={setFcAudioBypassed}
       />
       <FcOneKnobPro 
         isOpen={showFcOneKnobPro}
         onClose={() => setShowFcOneKnobPro(false)} 
         audioCtx={audioContextRef.current}
         inputNode={masterPluginInputRef.current}
         outputNode={masterPluginOutputRef.current}
         isBypassed={fcOneKnobBypassed}
         onBypassChange={setFcOneKnobBypassed}
       />
       <FcStudioFx 
         isOpen={showFcStudioFx}
         onClose={() => setShowFcStudioFx(false)} 
         audioCtx={audioContextRef.current}
         inputNode={masterPluginInputRef.current}
         outputNode={masterPluginOutputRef.current}
         isBypassed={fcStudioBypassed}
         onBypassChange={setFcStudioBypassed}
       />"""

content = content.replace(old_plugins_bottom, new_plugins_bottom)


# 2. Update the UI of FC AUDIO
fc_audio_old = """                   {/* Audio Enhancer Plugin */}
               <div 
                      className="w-full bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors group relative overflow-hidden"
                      onClick={() => {
                        if (!initAttemptedRef.current) initAudio();
                        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
                        setShowAudioEnhancer(true);
                      }}
                   >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)] group-hover:scale-110 transition-transform">
                           <Activity className="w-5 h-5 text-indigo-400" />
                        </div>
                    <div>
                           <h3 className="text-white text-sm font-bold tracking-wide flex items-center gap-2">
                              FC AUDIO
                              <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Active</span>
                           </h3>
                           <p className="text-white/50 text-[10px] uppercase font-semibold">Mastering & Dynamics</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-indigo-400 opacity-50 group-hover:opacity-100 transition-opacity relative z-10" />
                   </div>"""

fc_audio_new = """                   {/* Audio Enhancer Plugin */}
               <div 
                      className={`w-full ${!fcAudioBypassed ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-white/5 border-white/10 hover:border-white/20'} border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors group relative overflow-hidden`}
                      onClick={() => {
                        if (!initAttemptedRef.current) initAudio();
                        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
                        setShowAudioEnhancer(true);
                      }}
                   >
                  <div className={`absolute top-0 right-0 w-24 h-24 ${!fcAudioBypassed ? 'bg-indigo-500/10' : 'bg-white/5'} rounded-full blur-2xl -mr-10 -mt-10 transition-colors`}></div>
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 ${!fcAudioBypassed ? 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-white/5 text-white/40'}`}>
                           <Activity className="w-5 h-5" />
                        </div>
                    <div>
                           <h3 className="text-white text-sm font-bold tracking-wide flex items-center gap-2">
                              FC AUDIO
                              {!fcAudioBypassed && <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Active</span>}
                           </h3>
                           <p className="text-white/50 text-[10px] uppercase font-semibold">Mastering & Dynamics</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${!fcAudioBypassed ? 'border-indigo-500 bg-indigo-500' : 'border-white/20'} flex items-center justify-center relative z-10`}>
                        {!fcAudioBypassed && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>
                   </div>"""

content = content.replace(fc_audio_old, fc_audio_new)


# 3. Update the UI of FC ONE-KNOBS
fc_one_old = """                   {/* FC One-Knob Pro Plugin */}
               <div 
                      className="w-full bg-orange-500/10 border border-orange-500/20 hover:border-orange-500/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors group relative overflow-hidden"
                      onClick={() => {
                        if (!initAttemptedRef.current) initAudio();
                        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
                        setShowFcOneKnobPro(true);
                      }}
                   >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.2)] group-hover:scale-110 transition-transform">
                           <Sliders className="w-5 h-5 text-orange-400" />
                        </div>
                    <div>
                           <h3 className="text-white text-sm font-bold tracking-wide flex items-center gap-2">
                              FC ONE-KNOBS
                              <span className="text-[8px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Active</span>
                           </h3>
                           <p className="text-white/50 text-[10px] uppercase font-semibold">8 Macros</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-orange-400 opacity-50 group-hover:opacity-100 transition-opacity relative z-10" />
                   </div>"""

fc_one_new = """                   {/* FC One-Knob Pro Plugin */}
               <div 
                      className={`w-full ${!fcOneKnobBypassed ? 'bg-orange-500/10 border-orange-500/40' : 'bg-white/5 border-white/10 hover:border-white/20'} border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors group relative overflow-hidden`}
                      onClick={() => {
                        if (!initAttemptedRef.current) initAudio();
                        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
                        setShowFcOneKnobPro(true);
                      }}
                   >
                  <div className={`absolute top-0 right-0 w-24 h-24 ${!fcOneKnobBypassed ? 'bg-orange-500/10' : 'bg-white/5'} rounded-full blur-2xl -mr-10 -mt-10 transition-colors`}></div>
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 ${!fcOneKnobBypassed ? 'bg-orange-500/20 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'bg-white/5 text-white/40'}`}>
                           <Sliders className="w-5 h-5" />
                        </div>
                    <div>
                           <h3 className="text-white text-sm font-bold tracking-wide flex items-center gap-2">
                              FC ONE-KNOBS
                              {!fcOneKnobBypassed && <span className="text-[8px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Active</span>}
                           </h3>
                           <p className="text-white/50 text-[10px] uppercase font-semibold">8 Macros</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${!fcOneKnobBypassed ? 'border-orange-500 bg-orange-500' : 'border-white/20'} flex items-center justify-center relative z-10`}>
                        {!fcOneKnobBypassed && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>
                   </div>"""

content = content.replace(fc_one_old, fc_one_new)


# 4. Update the UI of FC STUDIO RACK
fc_rack_old = """                   {/* FC Studio FX Plugin */}
                   <div 
                      className="w-full bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors group relative overflow-hidden"
                      onClick={() => {
                        if (!initAttemptedRef.current) initAudio();
                        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
                        setShowFcStudioFx(true);
                      }}
                   >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:scale-110 transition-transform">
                           <Zap className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                           <h3 className="text-white text-sm font-bold tracking-wide flex items-center gap-2">
                              FC STUDIO RACK
                              <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Active</span>
                           </h3>
                           <p className="text-white/50 text-[10px] uppercase font-semibold">4-Unit Pro Rack</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-emerald-400 opacity-50 group-hover:opacity-100 transition-opacity relative z-10" />
                   </div>"""

fc_rack_new = """                   {/* FC Studio FX Plugin */}
                   <div 
                      className={`w-full ${!fcStudioBypassed ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-white/5 border-white/10 hover:border-white/20'} border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors group relative overflow-hidden`}
                      onClick={() => {
                        if (!initAttemptedRef.current) initAudio();
                        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
                        setShowFcStudioFx(true);
                      }}
                   >
                      <div className={`absolute top-0 right-0 w-24 h-24 ${!fcStudioBypassed ? 'bg-emerald-500/10' : 'bg-white/5'} rounded-full blur-2xl -mr-10 -mt-10 transition-colors`}></div>
                      <div className="flex items-center gap-3 relative z-10">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 ${!fcStudioBypassed ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white/5 text-white/40'}`}>
                           <Zap className="w-5 h-5" />
                        </div>
                        <div>
                           <h3 className="text-white text-sm font-bold tracking-wide flex items-center gap-2">
                              FC STUDIO RACK
                              {!fcStudioBypassed && <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Active</span>}
                           </h3>
                           <p className="text-white/50 text-[10px] uppercase font-semibold">4-Unit Pro Rack</p>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${!fcStudioBypassed ? 'border-emerald-500 bg-emerald-500' : 'border-white/20'} flex items-center justify-center relative z-10`}>
                        {!fcStudioBypassed && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </div>
                   </div>"""

content = content.replace(fc_rack_old, fc_rack_new)


# 5. Fix Active count
content = content.replace(
    '{(active8D ? 1 : 0) + (activeBassBoost ? 1 : 0) + (activeSpeedFx ? 1 : 0)} Active',
    '{(active8D ? 1 : 0) + (activeBassBoost ? 1 : 0) + (activeSpeedFx ? 1 : 0) + (!fcAudioBypassed ? 1 : 0) + (!fcOneKnobBypassed ? 1 : 0) + (!fcStudioBypassed ? 1 : 0)} Active'
)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)

