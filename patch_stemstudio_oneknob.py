import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'import { AudioEnhancer } from "./AudioEnhancer";',
    'import { AudioEnhancer } from "./AudioEnhancer";\nimport { FcOneKnobPro } from "./FcOneKnobPro";'
)

content = content.replace(
    'const [showAudioEnhancer, setShowAudioEnhancer] = useState<boolean>(false);',
    'const [showAudioEnhancer, setShowAudioEnhancer] = useState<boolean>(false);\n  const [showFcOneKnobPro, setShowFcOneKnobPro] = useState<boolean>(false);'
)

ui_audio_enhancer = """                   {/* Audio Enhancer Plugin */}
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

ui_oneknob = """                   {/* FC One-Knob Pro Plugin */}
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

content = content.replace(ui_audio_enhancer, ui_audio_enhancer + "\n\n" + ui_oneknob)

render_audio_enhancer = """       <AudioEnhancer 
         isOpen={showAudioEnhancer}
         onClose={() => setShowAudioEnhancer(false)} 
         audioCtx={audioContextRef.current}
         inputNode={masterPluginInputRef.current}
         outputNode={masterPluginOutputRef.current}
       />"""

render_oneknob = """       <FcOneKnobPro 
         isOpen={showFcOneKnobPro}
         onClose={() => setShowFcOneKnobPro(false)} 
         audioCtx={audioContextRef.current}
         inputNode={masterPluginInputRef.current}
         outputNode={masterPluginOutputRef.current}
       />"""

content = content.replace(render_audio_enhancer, render_audio_enhancer + "\n\n" + render_oneknob)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
print("Patched StemStudio")
