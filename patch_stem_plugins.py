import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# 1. Remove the Audio Enhancer from the Mixer section
str_to_remove = """             {expandedSections.mixer && (
                <div className="w-full mt-2">
                   <div 
                      className="w-full bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors group"
                      onClick={() => setShowAudioEnhancer(true)}
                   >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                           <Activity className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                           <h3 className="text-white text-sm font-bold tracking-wide">Audio Enhancer Plugin</h3>
                           <p className="text-white/50 text-[10px] uppercase font-semibold">Pro Mastering & Dynamics</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-indigo-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                   </div>
                </div>
             )}"""

if str_to_remove in content:
    content = content.replace(str_to_remove, "")
else:
    print("Could not find Audio Enhancer in Mixer section.")

# 2. Add local state for Plugins section
if "const [showPluginsList, setShowPluginsList] = useState(true);" not in content:
    content = content.replace(
        "const [showAudioEnhancer, setShowAudioEnhancer] = useState<boolean>(false);",
        "const [showAudioEnhancer, setShowAudioEnhancer] = useState<boolean>(false);\n  const [showPluginsList, setShowPluginsList] = useState(true);"
    )

# 3. Add Plugins Section below Master FX (or above it)
# Let's place it right before Master FX
plugins_section = """
          {/* PLUGINS RACK */}
          <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
             <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => setShowPluginsList(!showPluginsList)}>
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Activity className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Plugins Rack</h3>
                <div className="flex items-center gap-2">
                   <span className="text-[9px] font-mono font-medium text-white/30">1 Active</span>
                   {showPluginsList ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
                </div>
             </div>
             
             {showPluginsList && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {/* Audio Enhancer Plugin */}
                   <div 
                      className="w-full bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors group relative overflow-hidden"
                      onClick={() => setShowAudioEnhancer(true)}
                   >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)] group-hover:scale-110 transition-transform">
                           <Activity className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                           <h3 className="text-white text-sm font-bold tracking-wide flex items-center gap-2">
                              XRack Pro
                              <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Active</span>
                           </h3>
                           <p className="text-white/50 text-[10px] uppercase font-semibold">Mastering & Dynamics</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-indigo-400 opacity-50 group-hover:opacity-100 transition-opacity relative z-10" />
                   </div>

                   {/* Add Plugin Placeholder */}
                   <div className="w-full bg-white/5 border border-white/5 border-dashed hover:border-white/20 rounded-2xl p-4 flex items-center justify-center cursor-pointer transition-colors group">
                      <div className="flex items-center gap-2 text-white/30 group-hover:text-white/60 transition-colors">
                         <Plus className="w-4 h-4" />
                         <span className="text-[10px] font-bold uppercase tracking-wider">Add Plugin</span>
                      </div>
                   </div>
                </div>
             )}
          </div>
"""

master_fx_anchor = "{/* MASTER FX */}"
if master_fx_anchor in content:
    content = content.replace(master_fx_anchor, plugins_section + "\n          " + master_fx_anchor)
else:
    print("Could not find MASTER FX anchor.")

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)

print("StemStudio patched.")
