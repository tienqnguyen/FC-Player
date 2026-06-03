import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// The main return we want to replace starts after \n  };\n\n  return (\n
const functionEnd = "  };\n\n  return (";
const index = content.indexOf(functionEnd);

if (index !== -1) {
  const newUI = `  return (
    <div className="min-h-[100dvh] bg-[#0A0B10] text-[#E0E2E8] font-sans flex flex-col relative overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {audioError && (
        <div className="bg-red-500/90 text-white p-3 z-[60] text-sm text-center shadow-md">
           <Info className="w-4 h-4 inline mr-1" /> {audioError}
        </div>
      )}

      {/* Main Single Page Layout */}
      <div 
        className="flex-1 overflow-y-auto w-full h-full pb-10 custom-scrollbar relative z-10 p-4 max-w-screen-sm mx-auto flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <header className="flex justify-between items-center mb-6 pt-2">
            <h1 className="text-[18px] font-bold tracking-widest uppercase text-white/90 mx-auto">TikTok Player</h1>
        </header>

        {/* Input */}
        <div className="mb-6 shrink-0 z-20">
            <form onSubmit={handleTiktokFetch} className="relative flex gap-2">
              <input
                type="text"
                placeholder="TikTok profile or video link..."
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                className="w-full bg-[#12141D] border border-white/10 rounded-xl py-3 pl-10 pr-3 text-[14px] text-white placeholder:text-gray-500 focus:outline-none"
                disabled={isFetchingTiktok}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <button 
                type="submit" 
                disabled={isFetchingTiktok || !tiktokUrl}
                className="bg-[#0A84FF] text-white px-4 py-3 rounded-xl font-bold text-[13px] disabled:opacity-50 tracking-wide uppercase transition-transform active:scale-95 shrink-0"
              >
                  {isFetchingTiktok ? 'Load...' : 'Load'}
              </button>
            </form>
            {isFetchingTiktok && <p className="text-[#0A84FF] text-xs mt-2 animate-pulse text-center">Extracting audio data...</p>}
            {tiktokError && <p className="text-red-400 text-xs mt-2 text-center break-words">{tiktokError}</p>}
        </div>

        {/* Player Section */}
        {recentSongs.length > 0 && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[350px] bg-[#12141D] p-6 rounded-3xl border border-white/5 mb-6 shadow-xl relative isolate shrink-0">
            
            {/* Cover Art */}
            <div className="w-[180px] h-[180px] md:w-[220px] md:h-[220px] bg-[#1A1D27] rounded-3xl overflow-hidden shadow-2xl border border-white/10 mb-6 shrink-0 relative">
               {currentSong?.cover ? (
                  <img src={currentSong.cover} alt="Cover" className="w-full h-full object-cover opacity-90 transition-opacity" />
               ) : (
                  <div className="w-full h-full flex items-center justify-center"><Music className="w-16 h-16 text-white/20" /></div>
               )}
            </div>

            {/* Info */}
            <div className="text-center mb-6 w-full px-2">
                 <h2 className="text-[20px] md:text-[24px] font-black text-white tracking-tight truncate leading-tight w-full drop-shadow-sm">{fileName || "Unknown Track"}</h2>
                 <p className="text-[14px] text-gray-400 font-semibold tracking-wide truncate mt-1 break-all w-full">{currentSong?.author || "Unknown Artist"}</p>
            </div>

            {/* Time / Progress */}
            <div className="w-full max-w-sm mb-6">
                <div 
                    className="h-3 w-full bg-white/10 rounded-full cursor-pointer relative overflow-hidden group"
                    onClick={(e) => {
                      if (audioRef.current && duration) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = (e.clientX - rect.left) / rect.width;
                        audioRef.current.currentTime = pos * audioRef.current.duration;
                      }
                    }}
                >
                   <div ref={progressBarRef1} className="h-full bg-[#0A84FF] rounded-full pointer-events-none transition-none" style={{ width: '0%' }} />
                </div>
                <div className="flex justify-between text-[11px] font-bold text-gray-500 tracking-wider mt-2">
                   <span ref={currentTimeRef}>0:00</span>
                   <span>{formatDurationDisplay(duration)}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 md:gap-8 justify-center w-full">
                {/* HD Toggle */}
                <button 
                  onClick={() => { resumeContext(); toggleSignatureSound(!isSignatureSound); }} 
                  className={\`flex flex-col items-center justify-center p-2 rounded-xl border border-transparent transition-all active:scale-95 \${isSignatureSound ? 'text-[#0A84FF]' : 'text-gray-500 hover:text-white'}\`}
                  title="Toggle Lossless HD Audio"
                >
                    <Zap className={\`w-6 h-6 \${isSignatureSound ? 'fill-[#0A84FF]' : ''}\`} />
                    <span className="text-[9px] font-black uppercase tracking-wider mt-1 rounded-full px-1.5 py-0.5">HD</span>
                </button>

                <button onClick={handlePrevSong} className="text-white hover:text-white/70 active:scale-90 transition-all p-2">
                    <SkipBack className="w-8 h-8 fill-current" />
                </button>

                <button 
                    onClick={togglePlay}
                    className="w-[72px] h-[72px] md:w-[84px] md:h-[84px] rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                    {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                </button>

                <button onClick={handleNextSong} className="text-white hover:text-white/70 active:scale-90 transition-all p-2">
                    <SkipForward className="w-8 h-8 fill-current" />
                </button>

                <button 
                  onClick={() => {
                    const idx = recentSongs.findIndex(s => s.id === currentSong?.id);
                    if (idx !== -1) { 
                      playRecentSong(recentSongs[(idx + 1) % recentSongs.length]);
                    }
                  }}
                  className={\`p-2 text-gray-500 hover:text-white transition-all\`}
                  title="Next"
                >
                    <Repeat className="w-6 h-6" />
                </button>
            </div>
            
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-6">Swipe ← → For Next Track</p>
          </div>
        )}

        {/* Playlist */}
        {recentSongs.length > 0 && (
          <div className="w-full flex-1 min-h-0 shrink-0">
            <h3 className="text-[13px] font-bold tracking-widest uppercase text-gray-500 mb-3 px-2">Playlist ({recentSongs.length})</h3>
            <div className="flex flex-col gap-2">
               {recentSongs.map((song) => {
                  const isActive = currentSong?.id === song.id;
                  return (
                      <div 
                         key={song.id} 
                         onClick={() => playRecentSong(song)}
                         className={\`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all active:scale-[0.98] border border-white/5 \${isActive ? 'bg-[#181B26] border-[#0A84FF]/20 shadow-md' : 'bg-[#12141D]/50 hover:bg-[#181B26]'}\`}
                      >
                         <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[#0A0B10] flex items-center justify-center">
                            {song.cover ? (
                               <img src={song.cover} className="w-full h-full object-cover opacity-80" alt="cov" />
                            ) : (
                               <Music className="w-4 h-4 text-gray-500" />
                            )}
                         </div>
                         <div className="flex-1 min-w-0 pr-2">
                             <div className={\`text-[14px] font-bold tracking-tight truncate \${isActive ? 'text-[#0A84FF]' : 'text-white'}\`}>{song.title}</div>
                             <div className="text-[12px] text-gray-500 font-medium tracking-wide truncate mt-0.5">{song.author}</div>
                         </div>
                         {isActive && isPlaying && (
                             <div className="w-8 h-8 flex items-center justify-center shrink-0">
                                <div className="w-3 h-3 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin" />
                             </div>
                         )}
                      </div>
                  )
               })}
            </div>
          </div>
        )}

        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          autoPlay
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            handleEnded();
            if (currentSong && recentSongs.length > 1) {
              handleNextSong();
            }
          }}
          onLoadedMetadata={handleLoadedMetadata}
          crossOrigin="anonymous"
          className="hidden"
        />
      </div>
    </div>
  );
}
`;
  content = content.substring(0, index) + newUI;
  fs.writeFileSync('src/App.tsx', content, 'utf-8');
  console.log("Replaced from line 1400");
}
