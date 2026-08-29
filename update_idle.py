import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# Let's find:
search_str = """                                    </button>
                                 )}
                              </div>
                           </div>
                           
                           {/* Transcript (if any) */}
                           {transcript && (
                              <div className="w-full bg-black/40 border border-white/5 p-4 rounded-xl max-h-60 overflow-y-auto custom-scrollbar mt-2">
                                 <h5 className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Vietnamese Transcript</h5>
                                 <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">{transcript}</p>
                              </div>
                           )}
                        </div>
                     )}"""

if search_str in content:
    replacement = search_str + "\n                     {originalAudioUrl && !isTrimmingBeforeExtract && renderPluginsRack()}\n"
    content = content.replace(search_str, replacement)
    with open('src/components/StemStudio.tsx', 'w') as f:
        f.write(content)
    print("Injected into idle state successfully.")
else:
    print("Could not find the injection point for idle state.")
