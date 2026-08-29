import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# Add import
content = content.replace(
    'import { FcOneKnobPro } from "./FcOneKnobPro";',
    'import { FcOneKnobPro } from "./FcOneKnobPro";\nimport { FcStudioFx } from "./FcStudioFx";\nimport { Zap, Mic, Maximize } from "lucide-react";'
)

# Add state
content = content.replace(
    'const [showFcOneKnobPro, setShowFcOneKnobPro] = useState<boolean>(false);',
    'const [showFcOneKnobPro, setShowFcOneKnobPro] = useState<boolean>(false);\n  const [showFcStudioFx, setShowFcStudioFx] = useState<boolean>(false);'
)

# Add UI block
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

ui_studio = """                   {/* FC Studio FX Plugin */}
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

content = content.replace(ui_oneknob, ui_oneknob + "\n\n" + ui_studio)

# Add Render
render_oneknob = """       <FcOneKnobPro 
         isOpen={showFcOneKnobPro}
         onClose={() => setShowFcOneKnobPro(false)} 
         audioCtx={audioContextRef.current}
         inputNode={masterPluginInputRef.current}
         outputNode={masterPluginOutputRef.current}
       />"""

render_studio = """       <FcStudioFx 
         isOpen={showFcStudioFx}
         onClose={() => setShowFcStudioFx(false)} 
         audioCtx={audioContextRef.current}
         inputNode={masterPluginInputRef.current}
         outputNode={masterPluginOutputRef.current}
       />"""

content = content.replace(render_oneknob, render_oneknob + "\n\n" + render_studio)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
print("Patched StemStudio")
