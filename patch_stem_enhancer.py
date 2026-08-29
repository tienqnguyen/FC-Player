import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

div_to_add = """             {expandedSections.mixer && (
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

if "setShowAudioEnhancer(true)" not in content:
    # Find PixabayStudio
    idx = content.find("</PixabayStudio>")
    if idx == -1:
        # maybe it's self-closing
        idx = content.find("primaryStem={stemsList.includes('vocals') ? 'vocals' : stemsList[0]}\n                   />")
        if idx != -1:
            # find the closing div and brace
            search_str = "primaryStem={stemsList.includes('vocals') ? 'vocals' : stemsList[0]}\n                   />\n                </div>\n             )}"
            if search_str in content:
                content = content.replace(search_str, search_str + "\n" + div_to_add)
                
with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
print("Patched.")
