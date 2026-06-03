import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add touchStartRef
if (!content.includes('touchStartRef')) {
    content = content.replace('const audioRef = useRef<HTMLAudioElement>(null);', 
        'const audioRef = useRef<HTMLAudioElement>(null);\n  const touchStartRef = useRef<number | null>(null);');
}

// 2. Add handleTouchStart and handleTouchEnd
if (!content.includes('handleTouchStart')) {
    const handleTouchCode = `  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStartRef.current - touchEnd;
    
    if (distance > 50) {
      handleNextSong();
    } else if (distance < -50) {
      handlePrevSong();
    }
    touchStartRef.current = null;
  };
`;
    content = content.replace('const handleNextSong = () => {', handleTouchCode + '\n  const handleNextSong = () => {');
}

// 3. Replace the entire return statement
const splitIndex = content.indexOf('  return (\n    <div className="min-h-[100dvh]');
if (splitIndex === -1) {
    console.error("Could not find start of return block");
    process.exit(1);
}

const newJSX = `  return (
    <div className="min-h-[100dvh] bg-[#050B14] text-white font-sans flex flex-col relative overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {audioError && (
        <div className="absolute top-0 left-0 w-full bg-red-900/90 text-white p-2 z-[60] text-xs font-mono break-words shadow-lg border-b border-red-500">
          <strong>HD PIPELINE ERROR:</strong> {audioError}
        </div>
      )}

      {/* --- Main "Home" View --- */}
      <div 
        className={\`flex-1 overflow-y-auto pb-32 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] \${
          isExpanded ? "opacity-0 scale-95 pointer-events-none absolute inset-0" : "opacity-100 scale-100"
        }\`}
      >
        <header className="px-6 pt-12 pb-4 sticky top-0 z-20 bg-[#050B14]/90 backdrop-blur-md flex justify-between items-center">
            <button className="text-gray-400 hover:text-white transition-colors"><Menu className="w-6 h-6" /></button>
            <h1 className="text-[17px] font-semibold tracking-wide">Music Player</h1>
            <button className="text-gray-400 hover:text-white transition-colors"><Search className="w-6 h-6" /></button>
        </header>

        <main className="px-6 py-4 space-y-10">
          <div className="relative group">
            <form onSubmit={handleTiktokFetch} className="relative">
              <input
                type="text"
                placeholder="Search TikTok or paste link..."
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                className="w-full bg-[#111827] focus:bg-[#1E293B] border border-transparent rounded-[20px] py-3.5 pl-12 pr-4 text-[15px] text-white placeholder:text-gray-500 focus:outline-none transition-all shadow-sm"
                disabled={isFetchingTiktok}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#3B82F6] transition-colors" />
              <button type="submit" className="hidden">Submit</button>
            </form>
          </div>
          
          {isFetchingTiktok && (
             <p className="text-[#3B82F6] text-sm mt-4 flex items-center gap-3 font-medium animate-pulse">
               <div className="w-4 h-4 border-2 border-[#3B82F6]/30 border-t-[#3B82F6] rounded-full animate-spin" />
               Extracting studio quality audio...
             </p>
          )}
          {tiktokError && (
             <p className="text-red-400 text-sm mt-4 font-medium flex items-center gap-2"><Info className="w-4 h-4" /> {tiktokError}</p>
          )}

          <section>
             <label className="bg-[#111827] hover:bg-[#1E293B] active:scale-[0.98] transition-all rounded-[24px] p-5 flex items-center gap-5 cursor-pointer shadow-lg group">
                 <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-[#3B82F6] to-indigo-600 shadow-lg group-hover:scale-105 transition-transform">
                   <Upload className="w-6 h-6" />
                 </div>
                 <div>
                   <span className="font-bold text-[18px] tracking-tight block text-white mb-0.5">Import Local Audio</span>
                   <span className="text-[13px] text-gray-400 font-medium tracking-wide">Enhance your own files</span>
                 </div>
                 <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              </label>
          </section>

          {recentSongs.length > 0 && (
             <div onClick={() => playRecentSong(recentSongs[0])} className="w-full aspect-[16/10] rounded-[32px] bg-[#111827] overflow-hidden relative group cursor-pointer shadow-[0_15px_40px_rgba(0,0,0,0.6)] border border-white/5">
                 {recentSongs[0].cover ? (
                     <img src={recentSongs[0].cover} alt="Hero" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700" />
                 ) : (
                     <div className="w-full h-full bg-gradient-to-tr from-blue-900 to-indigo-950 opacity-60 group-hover:opacity-80 transition-all duration-700" />
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                 <div className="absolute bottom-6 left-6 right-6">
                     <p className="text-[32px] font-bold text-white leading-tight mb-1 truncate">{recentSongs[0].title}</p>
                     <p className="text-[14px] text-[#3B82F6] font-bold tracking-widest uppercase truncate">{recentSongs[0].author || "Recently Added"}</p>
                 </div>
                 <div className="absolute top-6 right-6 w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 group-hover:bg-[#3B82F6] transition-colors">
                    <Play className="w-5 h-5 text-white ml-0.5" />
                 </div>
             </div>
          )}

          {recentSongs.length > 1 && (
            <section>
              <h2 className="text-[20px] font-bold tracking-tight mb-4 flex items-center justify-between">
                <span>All Tracks</span>
                <span className="text-sm font-semibold text-gray-500 cursor-pointer hover:text-white transition-colors">See All</span>
              </h2>
              <div className="flex flex-col gap-2 relative">
                {recentSongs.slice(1).map((song, i) => {
                   const isActive = currentSong?.id === song.id;
                   return (
                       <div key={song.id} 
                            onClick={() => playRecentSong(song)}
                            className={\`flex items-center gap-4 p-3 rounded-[24px] cursor-pointer transition-all active:scale-[0.98] \${isActive ? 'bg-[#1E293B] shadow-lg border border-white/5' : 'hover:bg-[#111827]'}\`}>
                          <span className={\`font-bold w-6 text-center text-[13px] \${isActive ? 'text-[#3B82F6]' : 'text-gray-600'}\`}>{(i+1).toString().padStart(2, '0')}</span>
                          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#111827] flex-shrink-0 relative shadow-inner">
                             {song.cover ? (
                                 <img src={song.cover} alt="cover" className="w-full h-full object-cover" />
                             ) : (
                                 <Music className="w-6 h-6 text-gray-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                             )}
                             {isActive && isPlaying && (
                                 <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                                     <div className="w-4 h-4 border-[2px] border-white/90 border-t-transparent rounded-full animate-spin" />
                                 </div>
                             )}
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className={\`text-[16px] font-bold truncate tracking-tight mb-0.5 \${isActive ? 'text-white' : 'text-gray-200'}\`}>{song.title}</p>
                             <p className="text-[13px] text-gray-500 font-medium truncate">{song.author || "Unknown"}</p>
                          </div>
                          <button onClick={(e) => deleteRecentSong(song.id, e)} className="p-3 text-gray-500 rounded-full hover:text-white hover:bg-white/5 transition-colors">
                             <MoreHorizontal className="w-5 h-5" />
                          </button>
                       </div>
                   );
                })}
              </div>
            </section>
          )}
          
          <div className="h-32"></div>
        </main>
      </div>

      {/* --- Global Bottom Mini-Player OR Expanded Player --- */}
      <div 
        className={\`fixed bottom-0 left-0 right-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col \${
           isExpanded ? "h-[100dvh] translate-y-0" : "h-auto translate-y-0"
        }\`}
      >
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

        {/* Global Immersive Background (Shows only when expanded) */}
        <div className={\`absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-1000 \${isExpanded ? 'opacity-100 z-0' : 'opacity-0 z-0'}\`}>
           <div className="absolute inset-0 bg-[#050B14]" />
           {currentSong?.cover && (
              <img src={currentSong.cover} className="absolute inset-0 w-full h-full object-cover blur-[80px] opacity-[0.35] scale-125" alt="bg" />
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-[#050B14]/60 to-[#050B14]/80" />
        </div>

        {!isExpanded && (
          /* MINIPLAYER */
          <div className="flex flex-col relative z-20">
            <div className="relative px-4 pb-safe pt-2">
              {audioUrl && (
                <div 
                  onClick={() => setIsExpanded(true)}
                  className="bg-[#1E293B]/90 hover:bg-[#1E293B] md:mx-auto md:max-w-screen-md mx-auto w-full rounded-[28px] flex items-center justify-between p-2.5 cursor-pointer shadow-[0_15px_40px_rgba(0,0,0,0.6)] mb-3 transition-all backdrop-blur-2xl border border-white/10"
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1 relative z-10">
                    <div className="w-[46px] h-[46px] bg-[#0F172A] rounded-2xl shadow-inner overflow-hidden flex items-center justify-center flex-shrink-0 relative border border-white/5">
                       {currentSong?.cover ? (
                          <img src={currentSong.cover} className="w-full h-full object-cover relative z-10" alt="cover" />
                       ) : (
                          <Music className="w-5 h-5 text-gray-500 z-10" />
                       )}
                    </div>
                    <div className="flex-1 min-w-0 pr-2 flex flex-col justify-center">
                       <div className="text-[14.5px] font-bold tracking-tight truncate text-white">{fileName || "Unknown Track"}</div>
                       <div className="text-[12.5px] text-gray-400 font-medium tracking-wide truncate">{currentSong?.author ? (isSignatureSound ? currentSong.author + " • Lossless" : currentSong.author) : (isSignatureSound ? "HD Enhanced" : "Original")}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 pr-2 z-10">
                     <button 
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        className="text-white hover:scale-105 active:scale-95 transition-transform w-12 h-12 flex items-center justify-center rounded-full"
                     >
                        {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
                     </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Bottom Nav Bar */}
            <div className="flex items-center justify-around px-2 pt-3 pb-8 bg-[#050B14]/80 backdrop-blur-2xl -mx-4 border-t border-white/5 isolate">
                <button className="flex flex-col items-center gap-1 text-white opacity-40 hover:opacity-100 transition-opacity p-2">
                    <Home className="w-[22px] h-[22px]" />
                </button>
                <div className="relative p-2">
                    <button className="flex flex-col items-center gap-1 text-[#3B82F6]">
                        <Library className="w-[22px] h-[22px]" />
                    </button>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#3B82F6] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                </div>
                <button className="flex flex-col items-center gap-1 text-white opacity-40 hover:opacity-100 transition-opacity p-2">
                    <Heart className="w-[22px] h-[22px]" />
                </button>
                <button className="flex flex-col items-center gap-1 text-white opacity-40 hover:opacity-100 transition-opacity p-2">
                    <Speaker className="w-[22px] h-[22px]" />
                </button>
            </div>
          </div>
        )}

        {isExpanded && (
           <div 
             className="h-full w-full flex flex-col relative z-20 px-6 pt-12 pb-10"
             onTouchStart={handleTouchStart}
             onTouchEnd={handleTouchEnd}
           >
              {/* Header */}
              <div className="flex justify-between items-center mb-6 shrink-0 relative z-30">
                  <button onClick={() => setIsExpanded(false)} className="w-11 h-11 bg-white/5 hover:bg-white/15 active:scale-95 rounded-full flex items-center justify-center transition-all backdrop-blur-xl border border-white/5">
                     <ChevronDown className="w-6 h-6 text-white" />
                  </button>
                  <div className="flex flex-col items-center">
                     <h2 className="text-[18px] font-bold text-white tracking-wide truncate max-w-[200px] text-center">{fileName || "Unknown Track"}</h2>
                     <h3 className="text-[13px] font-medium text-gray-400 tracking-wide truncate max-w-[200px] text-center mt-0.5">{currentSong?.author || "Local Studio"}</h3>
                  </div>
                  <button className="w-11 h-11 bg-white/5 hover:bg-white/15 active:scale-95 rounded-full flex items-center justify-center transition-all backdrop-blur-xl border border-white/5">
                     <MoreHorizontal className="w-5 h-5 text-white" />
                  </button>
              </div>

              {/* Artwork & Visualizer Container */}
              <div className="flex-1 w-full max-h-[50vh] min-h-[300px] flex items-center justify-center relative my-8 isolate">
                  {/* Glowing Circular Visualizer */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60 mix-blend-screen scale-[1.05] z-0">
                     <Visualizer analyser={analyser} isPlaying={isPlaying} settings={{...visSettings, type: 'circular', palette: 'ocean', glowStrength: 20}} className="w-[120%] h-[120%] max-w-[600px] max-h-[600px]" />
                  </div>
                  
                  {/* Central Circular Artwork */}
                  <div className={\`w-[75vw] max-w-[340px] aspect-square rounded-full relative z-10 transition-all duration-700 ease-out \${isPlaying ? 'scale-100 shadow-[0_30px_70px_rgba(59,130,246,0.25)]' : 'scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'}\`}>
                      <div className="absolute inset-0 rounded-full border-[6px] border-[#0F172A] overflow-hidden bg-[#0a0f18] flex items-center justify-center shadow-inner">
                          {currentSong?.cover ? (
                              <img src={currentSong.cover} alt="cover" className="w-full h-full object-cover" />
                          ) : (
                              <Music className="w-24 h-24 text-[#1E293B]" />
                          )}
                      </div>
                      
                      {/* Integrated Play Button */}
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-20">
                          <button 
                              onClick={togglePlay}
                              className="w-16 h-16 rounded-full bg-[#1E3A8A] hover:bg-[#1D4ED8] active:scale-95 flex items-center justify-center shadow-[0_10px_30px_rgba(30,58,138,0.7)] transition-all border-4 border-[#050B14]"
                          >
                              {isPlaying ? <Pause className="w-6 h-6 text-white fill-white" /> : <Play className="w-6 h-6 text-white fill-white ml-1" />}
                          </button>
                      </div>
                  </div>
              </div>

              {/* Controls Section */}
              <div className="mt-auto flex flex-col gap-8 relative z-30 pt-8">
                  {/* Transport */}
                  <div className="flex justify-between items-center px-4">
                      <button className="text-gray-500 hover:text-white transition-colors p-2">
                          <Shuffle className="w-5 h-5" />
                      </button>
                      <div className="flex gap-12">
                          <button onClick={handlePrevSong} className="text-gray-300 hover:text-white active:scale-90 transition-all p-2">
                              <SkipBack className="w-8 h-8 fill-current" />
                          </button>
                          <button onClick={handleNextSong} className="text-gray-300 hover:text-white active:scale-90 transition-all p-2">
                              <SkipForward className="w-8 h-8 fill-current" />
                          </button>
                      </div>
                      <button className="text-[#3B82F6] relative p-2">
                          <Repeat className="w-5 h-5" />
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#3B82F6] rounded-full border border-[#050B14]" />
                      </button>
                  </div>

                  {/* Progress Line */}
                  <div className="px-2">
                      <div 
                        className="w-full h-1 bg-[#1E293B] rounded-full cursor-pointer flex items-center relative py-4 -my-4 group"
                        onClick={(e) => {
                          if (audioRef.current && !isNaN(audioRef.current.duration)) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const pos = (e.clientX - rect.left) / rect.width;
                            audioRef.current.currentTime = pos * audioRef.current.duration;
                          }
                        }}
                      >
                         <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-[#3B82F6] to-cyan-400 rounded-full pointer-events-none" style={{ width: \`\${progress}%\` }}>
                           <div className="w-[14px] h-[14px] bg-white rounded-full absolute -right-[7px] top-1/2 -translate-y-1/2 shadow-lg" />
                         </div>
                      </div>
                      <div className="flex justify-between mt-2 text-[12px] text-gray-500 font-medium tracking-wide">
                         <span>{audioRef.current ? formatDurationDisplay(audioRef.current.currentTime) : "0:00"}</span>
                         <div className="flex items-center gap-2">
                            {isSignatureSound && <span className="text-[#3B82F6] text-[9px] uppercase tracking-widest border border-[#3B82F6]/30 px-1.5 py-0.5 rounded">HD Engine</span>}
                            <span>{formatDurationDisplay(duration)}</span>
                         </div>
                      </div>
                  </div>
              </div>

              {/* Expanded Nav Bar */}
              <div className="flex items-center justify-between px-6 pt-10 pb-2 -mx-6 mt-6 border-t border-white/5 relative z-30">
                  <button onClick={() => setIsExpanded(false)} className="p-3 text-gray-500 hover:text-white transition-colors">
                      <Home className="w-6 h-6" />
                  </button>
                  <button className="p-3 text-white bg-white/5 rounded-full" onClick={() => setShowTuning(!showTuning)}>
                      <SlidersHorizontal className="w-6 h-6" />
                  </button>
                  <button className="p-3 text-gray-500 hover:text-white transition-colors">
                      <Heart className="w-6 h-6" />
                  </button>
                  <button onClick={handleExport} className={\`p-3 transition-colors \${isExporting ? 'text-[#3B82F6] animate-pulse' : 'text-gray-500 hover:text-white'}\`}>
                      <Download className="w-6 h-6" />
                  </button>
              </div>

              {/* Tuning Panel Modal */}
              {showTuning && (
                 <div className="absolute bottom-28 left-4 right-4 z-40 bg-[#0F172A]/95 backdrop-blur-3xl rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 animate-in fade-in slide-in-from-bottom-8 duration-500 max-h-[60vh] overflow-y-auto custom-scrollbar">
                   <div className="flex justify-between items-center mb-6">
                     <span className="text-[15px] font-bold tracking-widest text-white flex items-center gap-2"><Zap className="w-5 h-5 text-[#3B82F6]" /> DSP ENHANCER</span>
                     <button onClick={() => setShowTuning(false)} className="bg-white/5 p-2 rounded-full hover:bg-white/10 transition-colors"><ChevronDown className="w-5 h-5 text-white" /></button>
                   </div>
                   
                   {/* ... DSP controls content ... */}
                   <div className="flex items-center justify-between bg-black/40 p-4 rounded-[20px] border border-white/5 mb-6">
                      <div>
                          <p className="text-[14px] font-bold text-white mb-0.5">Signature Sound</p>
                          <p className="text-[12px] text-gray-400">Enable lossless HD pipeline</p>
                      </div>
                      <button 
                         onClick={() => { resumeContext(); toggleSignatureSound(!isSignatureSound); }}
                         className={\`w-14 h-8 rounded-full p-1 transition-all \${isSignatureSound ? 'bg-[#3B82F6]' : 'bg-white/10'}\`}
                      >
                          <div className={\`w-6 h-6 bg-white rounded-full transition-transform shadow-md \${isSignatureSound ? 'translate-x-6' : 'translate-x-0'}\`} />
                      </button>
                   </div>
                   
                   <div className="flex gap-2 mb-6 overflow-x-auto custom-scrollbar pb-2">
                     <button onClick={() => setActiveTab("presets")} className={\`px-5 py-2.5 rounded-full text-[13px] font-bold tracking-wide whitespace-nowrap transition-colors \${activeTab === 'presets' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white'}\`}>Presets</button>
                     <button onClick={() => setActiveTab("eq")} className={\`px-5 py-2.5 rounded-full text-[13px] font-bold tracking-wide whitespace-nowrap transition-colors \${activeTab === 'eq' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white'}\`}>EQ</button>
                     <button onClick={() => setActiveTab("spatial")} className={\`px-5 py-2.5 rounded-full text-[13px] font-bold tracking-wide whitespace-nowrap transition-colors \${activeTab === 'spatial' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white'}\`}>Spatial</button>
                     <button onClick={() => setActiveTab("viz")} className={\`px-5 py-2.5 rounded-full text-[13px] font-bold tracking-wide whitespace-nowrap transition-colors \${activeTab === 'viz' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white'}\`}>Visuals</button>
                   </div>
                   
                   {/* Simple render of tabs */}
                   <div className="animate-in fade-in">
                       {activeTab === 'presets' && (
                          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                             {PRESETS.map((p) => (
                               <div key={p.id} onClick={() => applyPreset(p)} className={\`flex-shrink-0 w-[140px] p-5 rounded-[24px] cursor-pointer transition-all snap-start active:scale-95 \${activePresetId === p.id ? 'bg-[#3B82F6] text-white shadow-lg scale-105' : 'bg-[#1E293B] hover:bg-[#1E293B]/80 text-white'}\`}>
                                 <p className="text-[15px] font-bold tracking-tight mb-1">{p.name}</p>
                                 <p className={\`text-[12px] leading-tight line-clamp-3 \${activePresetId === p.id ? 'text-blue-100' : 'text-gray-400'}\`}>{p.desc}</p>
                               </div>
                             ))}
                          </div>
                       )}

                       {activeTab === 'eq' && (
                          <div className="flex flex-col gap-6">
                             <div className="flex gap-1 justify-between mb-2">
                               {eqSettings.map((band, i) => (
                                  <button key={i} onClick={() => setActiveBand(i)} className={\`flex-1 py-3 px-1 text-[11px] rounded-xl text-center font-bold tracking-wider uppercase transition-all \${activeBand === i ? 'bg-white text-black shadow-md scale-110' : 'bg-[#1E293B] text-gray-500 hover:text-white'}\`}>
                                    {band.name.replace('Hz','').replace('kHz','k')}
                                  </button>
                               ))}
                             </div>
                             <div className="flex justify-between text-[15px] font-bold tracking-tight text-white px-2 mt-2">
                               <span className="text-gray-400">{eqSettings[activeBand].name}</span>
                               <span className={eqSettings[activeBand].g > 0 ? 'text-[#3B82F6]' : 'text-white'}>{eqSettings[activeBand].g > 0 ? "+" : ""}{eqSettings[activeBand].g.toFixed(1)} dB</span>
                             </div>
                             <input type="range" min="-12" max="12" step="0.1" value={eqSettings[activeBand].g} onChange={(e) => handleEqChange(activeBand, "g", parseFloat(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-[#1E293B] accent-[#3B82F6] outline-none cursor-pointer" />
                          </div>
                       )}
                       
                       {activeTab === 'spatial' && (
                         <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                            <div className="flex flex-col gap-3">
                              <span className="text-[12px] text-gray-500 font-bold tracking-widest uppercase">Sub-Bass</span>
                              <input type="range" min="0" max="1" step="0.05" value={spatialSettings.bassWeight} onChange={(e) => handleSpatialChange("bassWeight", parseFloat(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-[#1E293B] accent-[#3B82F6] outline-none cursor-pointer" />
                            </div>
                            <div className="flex flex-col gap-3">
                              <span className="text-[12px] text-gray-500 font-bold tracking-widest uppercase">Sparkle</span>
                              <input type="range" min="0" max="0.3" step="0.01" value={spatialSettings.clarity} onChange={(e) => handleSpatialChange("clarity", parseFloat(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-[#1E293B] accent-[#3B82F6] outline-none cursor-pointer" />
                            </div>
                            <div className="flex flex-col gap-3">
                              <span className="text-[12px] text-gray-500 font-bold tracking-widest uppercase">Width</span>
                              <input type="range" min="1.0" max="3.0" step="0.05" value={spatialSettings.wideness} onChange={(e) => handleSpatialChange("wideness", parseFloat(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-[#1E293B] accent-[#3B82F6] outline-none cursor-pointer" />
                            </div>
                            <div className="flex flex-col gap-3">
                              <span className="text-[12px] text-gray-500 font-bold tracking-widest uppercase">Ambience</span>
                              <input type="range" min="0" max="0.5" step="0.01" value={spatialSettings.reverb} onChange={(e) => handleSpatialChange("reverb", parseFloat(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-[#1E293B] accent-[#3B82F6] outline-none cursor-pointer" />
                            </div>
                         </div>
                       )}

                       {activeTab === 'viz' && (
                         <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-3">
                              <span className="text-[12px] font-bold tracking-widest text-gray-500 uppercase">Color Palette</span>
                              <div className="grid grid-cols-2 gap-3">
                                 {["gold", "ocean", "cyberpunk", "monochrome"].map(palette => (
                                    <button key={palette} onClick={() => setVisSettings(p => ({ ...p, palette }))} className={\`py-4 text-[13px] tracking-widest uppercase font-bold rounded-2xl transition-all \${visSettings.palette === palette ? 'bg-[#3B82F6] text-white shadow-lg' : 'bg-[#1E293B] text-gray-400 hover:text-white'}\`}>{palette}</button>
                                 ))}
                              </div>
                            </div>
                            <div className="flex flex-col gap-3">
                              <span className="text-[12px] font-bold tracking-widest text-gray-500 uppercase">Glow Intensity</span>
                              <input type="range" min="0.5" max="3.0" step="0.1" value={visSettings.colorIntensity} onChange={(e) => setVisSettings(p => ({...p, colorIntensity: parseFloat(e.target.value)}))} className="w-full h-2 rounded-full appearance-none bg-[#1E293B] accent-[#3B82F6] outline-none cursor-pointer" />
                            </div>
                         </div>
                       )}
                   </div>
                 </div>
              )}

           </div>
        )}
      </div>
    </div>
  );
}
`;

content = content.substring(0, splitIndex) + newJSX;
fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Written successfully");
