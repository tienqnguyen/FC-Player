import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# 1. Add state for showAiCloudConfig
state_injection = """  const [showPluginsList, setShowPluginsList] = useState(true);
  const [showAiCloudConfig, setShowAiCloudConfig] = useState(false);"""
content = content.replace('  const [showPluginsList, setShowPluginsList] = useState(true);', state_injection)


# 2. Extract AI Cloud Block
pattern = re.compile(r'\{/\* CUSTOM SERVER CONFIG / HF CLONE INSTRUCTIONS \*/\}([\s\S]*?)Active: Your Space will be prioritized for remote AI Cloud separation!\s*</div>\s*\)\}\s*</div>\s*</div>', re.MULTILINE)
match = pattern.search(content)

if match:
    ai_cloud_block = match.group(0)
    # Remove from original location
    content = content.replace(ai_cloud_block, '')
    print("Found and removed AI Cloud block")
else:
    print("Could not find AI Cloud block")
    
# 3. Create collapsible block
new_ai_cloud_block = """         {/* CUSTOM SERVER CONFIG / HF CLONE INSTRUCTIONS */}
         <div className="flex flex-col gap-3.5 border-t border-white/5 pt-5 pb-3">
             <div 
                 className="flex justify-between items-center border-b border-white/5 pb-1.5 cursor-pointer group"
                 onClick={() => setShowAiCloudConfig(!showAiCloudConfig)}
             >
                <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase flex items-center gap-1">
                       <Cloud className="w-3.5 h-3.5 text-amber-400" /> AI Cloud custom space
                    </h3>
                    <span className="text-[8px] bg-amber-400/10 border border-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded font-black font-mono">OPTIONAL</span>
                </div>
                {showAiCloudConfig ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
             </div>
             
             {showAiCloudConfig && (
                 <div className="bg-[#0A0A0C]/40 border border-white/5 p-4 rounded-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                       Avoid public API rate limits by duplicating the <strong>tienqnguyen95/Stemmix</strong> Hugging Face space for free!
                    </p>
                    
                    <div className="flex flex-col gap-1.5 bg-black/30 p-2.5 rounded-xl border border-white/5 text-[10px]">
                       <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                          <span className="w-4 h-4 rounded-full bg-amber-400/10 flex items-center justify-center text-[9px]">1</span>
                          <span>Duplicate the Space:</span>
                       </div>
                       <a 
                           href="https://huggingface.co/spaces/tienqnguyen95/Stemmix" 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="text-amber-400 hover:underline break-all font-mono font-bold"
                       >
                          https://huggingface.co/spaces/tienqnguyen95/Stemmix ↗
                       </a>
                       <div className="text-white/40 leading-normal pl-5">
                          Click the three dots in top-right → <strong>"Duplicate this Space"</strong>. Set visibility to <strong>Public</strong> (it runs on free hardware).
                       </div>
                       
                       <div className="flex items-center gap-1.5 text-amber-400 font-bold mt-2">
                          <span className="w-4 h-4 rounded-full bg-amber-400/10 flex items-center justify-center text-[9px]">2</span>
                          <span>Paste your Cloned Space ID below:</span>
                       </div>
                    </div>
                    
                    <div className="flex gap-2">
                       <input
                          type="text"
                          placeholder="e.g. your-username/Stemmix"
                          value={customSpaceUrl}
                          onChange={(e) => {
                             const val = e.target.value.trim();
                             setCustomSpaceUrl(val);
                             localStorage.setItem("stemmix_custom_space_url", val);
                          }}
                          className="flex-1 bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/15"
                       />
                       {customSpaceUrl && (
                          <button
                             type="button"
                             onClick={() => {
                                setCustomSpaceUrl("");
                                localStorage.removeItem("stemmix_custom_space_url");
                             }}
                             className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[10px] font-black uppercase rounded-xl transition-all border border-white/5"
                          >
                             Clear
                          </button>
                       )}
                    </div>
                    {customSpaceUrl && (
                       <div className="text-[9px] text-emerald-400 flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active: Your Space will be prioritized for remote AI Cloud separation!
                       </div>
                    )}
                 </div>
             )}
         </div>
"""

# 4. Insert at bottom of workspace container (after lyrics)
target_bottom = """         {/* LYRICS & TRANSCRIPT - MOVED TO BOTTOM */}
         <div id="lyrics-bottom-container" className="flex flex-col w-full gap-4 pt-4 border-t border-white/5">
             {subtitlesUI}
             {sunoLyricUI}
             {phoiKhiLyricUI}
         </div>"""

if target_bottom in content:
    content = content.replace(target_bottom, target_bottom + "\n\n" + new_ai_cloud_block)
    print("Inserted AI cloud block below lyrics")
else:
    print("Could not find lyrics target bottom block")

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)

