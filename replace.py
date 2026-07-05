with open('src/components/StemStudio.tsx', 'r') as f:
    lines = f.readlines()

new_content = """                 {/* LARGE INTEGRATED PLAYER & VISUALIZER */}
           <div className="bg-[#0A0A0C]/90 border border-white/5 rounded-[32px] flex flex-col shrink-0 relative overflow-hidden shadow-2xl shadow-black/50 mb-4">
              {/* Ambient Glows */}
              <div className="absolute top-0 right-1/4 w-72 h-72 bg-amber-400/5 rounded-full blur-3xl pointer-events-none z-0" />
              <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none z-0" />
              
              {/* Large Master Visualizer Canvas */}
              <div className="w-full h-40 sm:h-56 lg:h-72 relative bg-black/60 shadow-inner overflow-hidden border-b border-white/5 z-10">
                 <canvas 
                    ref={canvasRef} 
                    className="w-full h-full absolute inset-0 z-10"
                    style={{ mixBlendMode: 'screen' }}
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-black/20 to-transparent z-20 pointer-events-none" />
                 
                 {/* Visualizer Overlay Info */}
                 <div className="absolute bottom-4 left-5 right-5 z-30 flex flex-col sm:flex-row items-start sm:items-end justify-between pointer-events-none gap-2">
                    <div className="text-left min-w-0">
                       <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] sm:text-[10px] font-black text-black bg-amber-400 px-2 py-0.5 rounded uppercase tracking-widest shadow-md shadow-amber-400/20">StemMix V2 HD</span>
                          <span className="text-[9px] text-white/60 font-mono tracking-widest flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">
                             <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                             LIVE MASTER FEED
                          </span>
                       </div>
                       <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white truncate drop-shadow-lg tracking-tight" title={songTitle}>
                          {songTitle}
                       </h3>
                    </div>
                    
                    {isLoadingAudio ? (
                       <div className="flex flex-col text-left sm:text-right min-w-0 leading-tight bg-black/40 p-2.5 rounded-xl border border-white/10 backdrop-blur-md">
                          <span className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-widest animate-pulse flex items-center sm:justify-end gap-2">
                             <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> Buffering
                          </span>
                          <span className="text-[9px] text-white/50 font-mono uppercase tracking-widest mt-1">Stems: {loadedCount}/{stemsList.length}</span>
                       </div>
                    ) : (
                       <div className="flex flex-col text-left sm:text-right min-w-0 leading-tight bg-black/40 p-2.5 rounded-xl border border-white/10 backdrop-blur-md">
                          <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest flex items-center sm:justify-end gap-2">
                             {isPlaying ? "● PLAYING" : "❚❚ PAUSED"}
                          </span>
                          <span className="text-[8px] sm:text-[9px] text-white/50 font-mono uppercase tracking-widest mt-1">Multi-Track Biquad EQ Ready</span>
                       </div>
                    )}
                 </div>
              </div>

              {/* Player Controls */}
              <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-5 bg-white/[0.01] backdrop-blur-xl z-20 relative border-t border-white/5 shadow-inner">
                 <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-center sm:justify-start">
                    <button 
                       onClick={togglePlay}
                       className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:bg-amber-400 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(251,191,36,0.3)] shrink-0"
                       title={isPlaying ? "Pause" : "Play"}
                    >
                       {isLoadingAudio ? (
                          <Loader2 className="w-6 h-6 animate-spin text-black" />
                       ) : isPlaying ? (
                          <Pause className="w-6 h-6 text-black fill-black" />
                       ) : (
                          <Play className="w-6 h-6 text-black fill-black ml-1" />
                       )}
                    </button>
                    
                    <div className="hidden sm:flex flex-col min-w-0 leading-tight">
                       <span className="text-xs font-extrabold text-white/80 uppercase tracking-widest">Transport</span>
                       <span className="text-[9px] text-white/40 font-mono tracking-wider mt-0.5">Control</span>
                    </div>
                 </div>

                 {/* Seeker */}
                 <div className="w-full flex-1 max-w-full sm:max-w-xl flex items-center gap-3.5 text-xs font-mono font-medium text-white/60 shrink-0 bg-black/50 py-3 px-5 rounded-2xl border border-white/10 shadow-inner">
                    <span className="w-12 text-right">{formatTime(currentTime)}</span>
                    <input 
                       type="range" 
                       min={0} max={duration || 100} 
                       value={currentTime} 
                       onChange={handleSeek}
                       className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300 transition-all focus:outline-none focus:ring-4 focus:ring-amber-400/20"
                    />
                    <span className="w-12 text-left">{formatTime(duration)}</span>
                 </div>
              </div>
           </div>
"""

start_idx = 730
end_idx = 807

lines = lines[:start_idx] + [new_content] + lines[end_idx:]

with open('src/components/StemStudio.tsx', 'w') as f:
    f.writelines(lines)

