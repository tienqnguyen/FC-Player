import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

old_code = """         <div className="flex items-center justify-between border-b border-white/5 py-4 cursor-pointer group" onClick={() => setShowPluginsList(!showPluginsList)}>
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Activity className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Plugins Rack</h3>
            <div className="flex items-center gap-2">
                   <span className="text-[9px] font-mono font-medium text-white/30">{(active8D ? 1 : 0) + (activeBassBoost ? 1 : 0) + (activeSpeedFx ? 1 : 0) + (!fcAudioBypassed ? 1 : 0) + (!fcOneKnobBypassed ? 1 : 0) + (!fcStudioBypassed ? 1 : 0)} Active</span>
                   {showPluginsList ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
                </div>
             </div>"""

new_code = """         <div className="flex items-center justify-between border-b border-white/5 py-4 cursor-pointer group" onClick={() => setShowPluginsList(!showPluginsList)}>
                <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Activity className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Plugins Rack</h3>
            <div className="flex items-center gap-2">
                   <button 
                       onClick={(e) => {
                          e.stopPropagation();
                          setActive8D(false);
                          setActiveBassBoost(false);
                          setActiveSpeedFx(false);
                          setFcAudioBypassed(true);
                          setFcOneKnobBypassed(true);
                          setFcStudioBypassed(true);
                       }}
                       className="text-[8px] font-black uppercase tracking-wider sm:tracking-widest text-white/40 hover:text-white/80 active:scale-95 transition-all bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg mr-2"
                   >
                       Reset All
                   </button>
                   <span className="text-[9px] font-mono font-medium text-white/30">{(active8D ? 1 : 0) + (activeBassBoost ? 1 : 0) + (activeSpeedFx ? 1 : 0) + (!fcAudioBypassed ? 1 : 0) + (!fcOneKnobBypassed ? 1 : 0) + (!fcStudioBypassed ? 1 : 0)} Active</span>
                   {showPluginsList ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
                </div>
             </div>"""

if old_code in content:
    content = content.replace(old_code, new_code)
    print("Replaced!")
else:
    print("Could not find the target code block.")

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
