with open("src/components/StemStudio.tsx", "r") as f:
    content = f.read()

buttons_to_move = """                             {stem === 'vocals' && (
                                <>
                                <button
                                   onClick={handleGenerateSubtitles}
                                   className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-wider transition-all duration-300 border bg-transparent border-transparent text-white/40 hover:text-white hover:bg-white/5 relative"
                                   title="Transcribe Vocals (WebGPU Whisper)"
                                >
                                   {isTranscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Type className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                   onClick={handleCohereTranscribe}
                                   className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-wider transition-all duration-300 border bg-transparent border-transparent text-white/40 hover:text-amber-400 hover:bg-white/5 relative"
                                   title="Transcribe with Cohere (Better Vietnamese)"
                                >
                                   {isTranscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Sparkles className="w-3.5 h-3.5" />}
                                </button>
                                </>
                             )}"""

if buttons_to_move in content:
    print("Found buttons to remove")
    content = content.replace(buttons_to_move, "")
else:
    print("Could not find buttons to remove")

target_marker = """                 </div>
              </div>
           </div>"""

buttons_in_right_section = """                 </div>
                 
                 {/* Right: Transcription Tools */}
                 <div className="flex items-center gap-2 w-full md:w-auto shrink-0 bg-black/20 p-2 rounded-xl border border-white/5 h-16 sm:h-20 justify-center">
                    <div className="flex flex-col items-center gap-1 w-full text-center">
                       <span className="text-[9px] font-bold tracking-[0.1em] text-white/40 uppercase mb-0.5">Subtitles</span>
                       <div className="flex gap-1.5">
                           <button
                               onClick={handleGenerateSubtitles}
                               className="h-8 px-3 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border bg-black/40 border-white/5 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/15"
                               title="Transcribe Vocals (WebGPU Whisper)"
                           >
                               {isTranscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Type className="w-3.5 h-3.5" />}
                           </button>
                           <button
                               onClick={handleCohereTranscribe}
                               className="h-8 px-3 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border bg-black/40 border-white/5 text-amber-400/80 hover:text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/30"
                               title="Transcribe with Cohere (Better Vietnamese)"
                           >
                               {isTranscribing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                               Cohere
                           </button>
                       </div>
                    </div>
                 </div>
              </div>
           </div>"""

if target_marker in content:
    print("Found target marker")
    content = content.replace(target_marker, buttons_in_right_section)
else:
    print("Could not find target marker")

with open("src/components/StemStudio.tsx", "w") as f:
    f.write(content)
