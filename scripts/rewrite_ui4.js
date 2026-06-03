import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const splitToken = '  return (\n    <div className="min-h-[100dvh] bg-[#050B14]';
const splitIndex = content.indexOf(splitToken);

if (splitIndex === -1) {
  console.log("Could not find start index");
  process.exit(1);
}

const newJSX = `  return (
    <div className="min-h-[100dvh] bg-[#0A0B10] text-[#E0E2E8] font-sans flex flex-col relative overflow-hidden selection:bg-[#0A84FF]/30" style={{ fontFamily: "'Inter', sans-serif" }}>
      {audioError && (
        <div className="absolute top-0 left-0 w-full bg-red-500/90 backdrop-blur-md text-white p-3 z-[60] text-sm font-medium shadow-2xl flex items-center justify-center gap-2">
          <Info className="w-4 h-4" /> <strong>Audio Engine Error:</strong> {audioError}
        </div>
      )}

      {/* --- Main "Home" View --- */}
      <div 
        className={\`flex-1 overflow-y-auto pb-32 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] \${
          isExpanded ? "opacity-0 scale-95 pointer-events-none absolute inset-0" : "opacity-100 scale-100"
        }\`}
      >
        <header className="px-6 pt-14 pb-6 sticky top-0 z-20 bg-[#0A0B10]/80 backdrop-blur-2xl border-b border-white/5 flex justify-between items-center isolate">
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF]"><Menu className="w-5 h-5 text-white" /></button>
            <h1 className="text-[16px] font-bold tracking-widest uppercase text-white/90">Music Player</h1>
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF]"><Search className="w-5 h-5 text-white" /></button>
        </header>

        <main className="px-6 py-6 space-y-12">
          <div className="relative group">
            <form onSubmit={handleTiktokFetch} className="relative">
              <input
                type="text"
                placeholder="Search TikTok or paste link..."
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                className="w-full bg-[#12141D] focus:bg-[#181B26] border border-white/5 focus:border-[#0A84FF]/50 rounded-[24px] py-4 pl-14 pr-4 text-[15px] text-white placeholder:text-gray-500 focus:outline-none transition-all shadow-inner"
                disabled={isFetchingTiktok}
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#0A84FF] transition-colors" />
              <button type="submit" className="hidden">Submit</button>
            </form>
          </div>
          
          {isFetchingTiktok && (
             <p className="text-[#0A84FF] text-sm mt-4 flex items-center gap-3 font-medium animate-pulse">
               <span className="w-4 h-4 border-2 border-[#0A84FF]/30 border-t-[#0A84FF] rounded-full animate-spin block" />
               Extracting studio quality audio...
             </p>
          )}
          {tiktokError && (
             <p className="text-red-400 text-sm mt-4 font-medium flex items-center gap-2"><Info className="w-4 h-4" /> {tiktokError}</p>
          )}


          {recentSongs.length > 0 ? (
             <div className="space-y-6">
                <div className="flex items-end justify-between px-1">
                   <h2 className="text-[22px] font-bold text-white tracking-tight">Listen Now</h2>
                   <button className="text-[13px] font-bold text-[#0A84FF] uppercase tracking-wider hover:text-white transition-colors">View All</button>
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar -mx-6 px-6 snap-x snap-mandatory">
                   {recentSongs.slice(0, 5).map(song => (
                       <div key={song.id} 
                            onClick={() => playRecentSong(song)}
                            className="snap-center shrink-0 w-[260px] cursor-pointer group">
                           <div className="w-full aspect-square rounded-[32px] overflow-hidden relative shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-white/5 mb-4 isolate">
                               {song.cover ? (
                                   <img src={song.cover} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                               ) : (
                                   <div className="w-full h-full bg-gradient-to-br from-[#1A1D27] to-[#12141D] flex items-center justify-center">
                                      <Music className="w-16 h-16 text-white/10" />
                                   </div>
                               )}
                               <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                   <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
                                       <Play className="w-6 h-6 text-white ml-1" />
                                   </div>
                               </div>
                           </div>
                           <h3 className="font-bold text-[17px] text-white tracking-tight truncate px-2">{song.title}</h3>
                           <p className="text-[14px] text-gray-500 font-medium truncate mt-0.5 px-2">{song.author || "Unknown Artist"}</p>
                       </div>
                   ))}
                </div>
             </div>
          ) : (
            <section>
               <label className="bg-[#12141D] hover:bg-[#181B26] active:scale-[0.98] transition-all rounded-[32px] p-6 flex flex-col items-center gap-4 cursor-pointer shadow-lg border border-white/5 group text-center">
                   <div className="w-16 h-16 rounded-[20px] flex items-center justify-center text-white bg-[#1A1D27] group-hover:bg-[#0A84FF] transition-colors shadow-inner">
                     <Upload className="w-7 h-7" />
                   </div>
                   <div>
                     <span className="font-bold text-[18px] tracking-tight block text-white mb-1">Upload Audio</span>
                     <span className="text-[14px] text-gray-500 font-medium">Enhance your local tracks here</span>
                   </div>
                   <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                </label>
            </section>
          )}

          {recentSongs.length > 1 && (
            <section className="space-y-4">
              <h2 className="text-[15px] font-bold text-gray-500 uppercase tracking-widest px-1 mb-2">Queue</h2>
              <div className="flex flex-col gap-2">
                {recentSongs.slice(1).map((song, i) => {
                   const isActive = currentSong?.id === song.id;
                   return (
                       <div key={song.id} 
                            onClick={() => playRecentSong(song)}
                            className={\`flex items-center gap-4 p-3 rounded-[24px] cursor-pointer transition-all active:scale-[0.98] \${isActive ? 'bg-[#181B26] border border-white/10 shadow-md' : 'hover:bg-[#181B26] border border-transparent'}\`}>
                          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#1A1D27] flex-shrink-0 relative shadow-inner">
                             {song.cover ? (
                                 <img src={song.cover} alt="cover" className="w-full h-full object-cover" />
                             ) : (
                                 <Music className="w-5 h-5 text-gray-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                             )}
                             {isActive && isPlaying && (
                                 <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
                                     <div className="w-4 h-4 border-2 border-white/90 border-t-transparent rounded-full animate-spin" />
                                 </div>
                             )}
                          </div>
                          <div className="flex-1 min-w-0 pr-2">
                             <p className={\`text-[16px] font-bold truncate tracking-tight mb-0.5 \${isActive ? 'text-white' : 'text-[#E0E2E8]'}\`}>{song.title}</p>
                             <p className="text-[13px] text-gray-500 font-medium truncate">{song.author || "Unknown Artist"}</p>
                          </div>
                          <button onClick={(e) => deleteRecentSong(song.id, e)} className="p-3 text-gray-500 rounded-full hover:text-white hover:bg-white/5 transition-colors focus:ring-2 focus:ring-white">
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

      {/* --- Global Player System --- */}
      <div 
        className={\`fixed bottom-0 left-0 right-0 z-[100] transition-all duration-[600ms] ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col \${
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

        {/* Dynamic Ambiance for Expanded View */}
        <div className={\`absolute inset-0 pointer-events-none transition-opacity duration-1000 \${isExpanded ? 'opacity-100 z-0' : 'opacity-0 z-0'}\`}>
           <div className="absolute inset-0 bg-[#0A0B10]" />
           {currentSong?.cover && (
              <img src={currentSong.cover} className="absolute inset-0 w-full h-full object-cover blur-[80px] opacity-[0.25] scale-125 saturate-200" alt="bg" />
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B10] via-transparent to-[#0A0B10]/80" />
           
           {/* Visualizer container that stretches appropriately */}
           <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 aspect-square flex items-center justify-center opacity-70 mix-blend-screen scale-[1.15]">
              <Visualizer analyser={analyser} isPlaying={isPlaying} settings={{...visSettings, type: 'circular', palette: 'ocean', glowStrength: 20}} className="w-full h-full max-w-[800px] max-h-[800px]" />
           </div>
        </div>

        {!isExpanded && (
          /* MINIPLAYER */
          <div className="flex flex-col relative z-20">
            <div className="relative px-3 pb-safe pt-2">
              {audioUrl && (
                <div 
                  onClick={() => setIsExpanded(true)}
                  className="bg-[#12141D]/90 hover:bg-[#181B26]/90 md:mx-auto md:max-w-screen-md mx-auto w-full rounded-[24px] flex items-center justify-between p-2 cursor-pointer shadow-[0_20px_40px_rgba(0,0,0,0.6)] mb-2 transition-all backdrop-blur-3xl border border-white/10"
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1 relative z-10">
                    <div className="w-[48px] h-[48px] bg-[#1A1D27] rounded-[18px] overflow-hidden flex items-center justify-center flex-shrink-0 relative border border-white/5">
                       {currentSong?.cover ? (
                          <img src={currentSong.cover} className="w-full h-full object-cover relative z-10" alt="cover" />
                       ) : (
                          <Music className="w-5 h-5 text-gray-500 z-10" />
                       )}
                    </div>
                    <div className="flex-1 min-w-0 pr-2 flex flex-col justify-center">
                       <div className="text-[15px] font-bold tracking-tight truncate text-white">{fileName || "Unknown Track"}</div>
                       <div className="text-[13px] text-gray-400 font-medium tracking-wide truncate mt-0.5">{currentSong?.author ? (isSignatureSound ? currentSong.author + " • Lossless" : currentSong.author) : (isSignatureSound ? "HD Enhanced" : "Original")}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 pr-2 z-10">
                     <button 
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        className="text-white hover:scale-105 active:scale-95 transition-transform w-[44px] h-[44px] flex items-center justify-center rounded-full bg-white/10"
                     >
                        {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                     </button>
                  </div>
                  
                  <div className="absolute bottom-[2px] left-6 right-6 h-[2px] bg-white/10 rounded-full overflow-hidden pointer-events-none md:max-w-screen-md md:mx-auto mx-2 z-20">
                     <div className="h-full bg-white transition-all duration-150" style={{ width: \`\${progress}%\` }} />
                  </div>
                </div>
              )}
            </div>
            
            {/* Bottom Nav Bar */}
            <div className="flex items-center justify-around px-4 pt-3 pb-6 bg-[#0A0B10]/95 backdrop-blur-3xl border-t border-white/5 isolate">
                <button className="flex flex-col items-center text-white opacity-40 hover:opacity-100 transition-opacity p-2">
                    <Home className="w-6 h-6" />
                </button>
                <div className="relative p-2">
                    <button className="flex flex-col items-center text-white shadow-[0_0_15px_rgba(255,255,255,0.2)] bg-white/10 p-2 rounded-xl">
                        <Library className="w-6 h-6" />
                    </button>
                </div>
                <button className="flex flex-col items-center text-white opacity-40 hover:opacity-100 transition-opacity p-2">
                    <Heart className="w-6 h-6" />
                </button>
                <button className="flex flex-col items-center text-[10px] text-white opacity-40 hover:opacity-100 transition-opacity p-2 font-bold tracking-widest uppercase gap-1">
                    <div className="w-6 h-6 rounded-full border-2 border-white/50 bg-[#1A1D27] flex items-center justify-center"><User className="w-3 h-3 text-white" /></div>
                    Profile
                </button>
            </div>
          </div>
        )}

        {isExpanded && (
           <div 
             className="h-full w-full flex flex-col relative z-20 px-6 pt-14 pb-8"
             onTouchStart={handleTouchStart}
             onTouchEnd={handleTouchEnd}
           >
              {/* Top Action Bar */}
              <div className="flex justify-between items-center shrink-0 relative z-30 mb-8">
                  <button onClick={() => setIsExpanded(false)} className="w-12 h-12 bg-white/5 hover:bg-white/15 active:scale-95 rounded-full flex items-center justify-center transition-all backdrop-blur-xl border border-white/10 shadow-lg">
                     <ChevronDown className="w-7 h-7 text-white" />
                  </button>
                  <div className="text-center">
                     <p className="text-[12px] font-black tracking-widest text-[#0A84FF] uppercase drop-shadow-md">Now Playing</p>
                     <p className="text-[14px] font-semibold text-white/90 truncate max-w-[200px]">{currentSong?.author || "Local Audio"}</p>
                  </div>
                  <button className="w-12 h-12 bg-white/5 hover:bg-white/15 active:scale-95 rounded-full flex items-center justify-center transition-all backdrop-blur-xl border border-white/10 shadow-lg">
                     <MoreHorizontal className="w-6 h-6 text-white" />
                  </button>
              </div>

              {/* Central Album Artwork */}
              <div className="flex-1 flex flex-col justify-center items-center relative z-20 w-full -mt-4 mb-4">
                  <div className={\`w-full max-w-[340px] aspect-square rounded-[40px] flex items-center justify-center relative transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] \${isPlaying ? 'scale-100 shadow-[0_40px_80px_rgba(0,0,0,0.4)]' : 'scale-[0.9] shadow-[0_20px_40px_rgba(0,0,0,0.4)]'}\`}>
                     <div className="absolute inset-0 rounded-[40px] overflow-hidden bg-[#1A1D27] border border-white/10 flex items-center justify-center">
                        {currentSong?.cover ? (
                           <img src={currentSong.cover} alt="cover" className="w-[110%] max-w-[110%] h-[110%] object-cover object-center relative left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                        ) : (
                           <Music className="w-24 h-24 text-white/10" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                     </div>
                  </div>
              </div>

              {/* Title & Artist */}
              <div className="flex justify-between items-center mb-10 px-2 relative z-30 shrink-0">
                  <div className="flex-1 min-w-0 pr-4">
                     <h2 className="text-[28px] font-black text-white tracking-tight truncate leading-tight drop-shadow-md">{fileName || "Unknown Track"}</h2>
                     <p className="text-[16px] text-white/60 font-semibold tracking-wide truncate mt-1 drop-shadow-md">{currentSong?.author || "Local Studio"}</p>
                  </div>
                  <button className="text-white hover:text-red-500 hover:scale-110 active:scale-95 transition-all p-3.5 rounded-full bg-white/5 border border-white/10 shadow-lg">
                     <Heart className="w-7 h-7" />
                  </button>
              </div>

              {/* Progress Slider (No clipping text!) */}
              <div className="mb-10 px-2 shrink-0 relative z-30">
                  <div 
                    className="w-full h-2.5 bg-white/10 rounded-full cursor-pointer flex items-center relative group shadow-inner mb-4"
                    onClick={(e) => {
                      if (audioRef.current && !isNaN(audioRef.current.duration)) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = (e.clientX - rect.left) / rect.width;
                        audioRef.current.currentTime = pos * audioRef.current.duration;
                      }
                    }}
                  >
                     <div className="h-full bg-white rounded-full pointer-events-none relative" style={{ width: \`\${progress}%\` }}>
                       <div className="w-[18px] h-[18px] bg-white rounded-full absolute -right-[9px] top-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(255,255,255,0.7)] scale-0 group-hover:scale-100 transition-transform" />
                     </div>
                  </div>
                  
                  {/* Distinct Text Container below the bar */}
                  <div className="flex justify-between text-[13px] font-bold text-white/60 tracking-wider">
                     <span>{audioRef.current ? formatDurationDisplay(audioRef.current.currentTime) : "0:00"}</span>
                     <span>{formatDurationDisplay(duration)}</span>
                  </div>
              </div>

              {/* Primary Controls */}
              <div className="flex justify-between items-center shrink-0 relative z-30 mb-8 px-2">
                  <button className="text-white/40 hover:text-white transition-colors p-2">
                      <Shuffle className="w-7 h-7" />
                  </button>
                  <div className="flex items-center gap-8">
                      <button onClick={handlePrevSong} className="text-white hover:text-white/80 active:scale-90 transition-all">
                          <SkipBack className="w-10 h-10 fill-current" />
                      </button>
                      <button 
                          onClick={togglePlay}
                          className="w-[84px] h-[84px] rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                      >
                          {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
                      </button>
                      <button onClick={handleNextSong} className="text-white hover:text-white/80 active:scale-90 transition-all">
                          <SkipForward className="w-10 h-10 fill-current" />
                      </button>
                  </div>
                  <button className="text-[#0A84FF] relative p-2">
                      <Repeat className="w-7 h-7" />
                      <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0A84FF] rounded-full" />
                  </button>
              </div>
              
              {/* Bottom Action Footer */}
              <div className="flex items-center justify-between mt-auto relative z-30 px-6 py-4 -mx-6">
                 <button className="flex flex-col items-center justify-center p-2 text-white/60 hover:text-white transition-colors">
                    <ListMusic className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Queue</span>
                 </button>
                 
                 <button 
                    onClick={() => setShowTuning(!showTuning)}
                    className={\`flex items-center gap-2 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-[11px] transition-all border shadow-lg \${showTuning ? 'bg-white text-black border-transparent' : 'bg-black/50 text-white border-white/10 hover:border-white/20'}\`}
                 >
                    <SlidersHorizontal className="w-4 h-4" /> Sound Engine
                 </button>
                 
                 <button onClick={handleExport} className={\`flex flex-col items-center justify-center p-2 transition-colors \${isExporting ? 'text-[#0A84FF] animate-pulse' : 'text-white/60 hover:text-white'}\`}>
                    <Download className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Save</span>
                 </button>
              </div>

              {/* Tuning Overlay Slideup */}
              <div className={\`absolute bottom-0 left-0 right-0 z-40 bg-[#0A0B10]/95 backdrop-blur-3xl rounded-t-[40px] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] border-t border-white/10 transition-transform duration-500 ease-out \${showTuning ? 'translate-y-0' : 'translate-y-full'}\`}>
                 <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                   <div className="flex justify-between items-center mb-8">
                     <span className="text-[16px] font-black tracking-[0.2em] text-[#E0E2E8] flex items-center gap-3"><Zap className="w-6 h-6 text-[#0A84FF] fill-[#0A84FF]" /> ENGINE CONTROL</span>
                     <button onClick={() => setShowTuning(false)} className="bg-white/5 p-3 rounded-full hover:bg-white/10 transition-colors"><ChevronDown className="w-6 h-6 text-white" /></button>
                   </div>
                   
                   <div className="flex items-center justify-between bg-white/5 p-5 rounded-[28px] border border-white/5 mb-8 hover:bg-white/10 transition-colors">
                      <div>
                          <p className="text-[16px] font-bold text-white mb-1">High-Res Mode</p>
                          <p className="text-[13px] font-medium text-gray-400">Enable advanced lossless pipeline</p>
                      </div>
                      <button 
                         onClick={() => { resumeContext(); toggleSignatureSound(!isSignatureSound); }}
                         className={\`w-[56px] h-[32px] rounded-full p-1 transition-all flex items-center \${isSignatureSound ? 'bg-[#0A84FF]' : 'bg-white/10'}\`}
                      >
                          <div className={\`w-[24px] h-[24px] bg-white rounded-full transition-transform shadow-md \${isSignatureSound ? 'translate-x-[24px]' : 'translate-x-0'}\`} />
                      </button>
                   </div>
                   
                   <div className="flex gap-2 mb-8 overflow-x-auto custom-scrollbar pb-2 mask-linear">
                     <button onClick={() => setActiveTab("presets")} className={\`px-6 py-3 rounded-full text-[14px] font-bold tracking-wide whitespace-nowrap transition-colors \${activeTab === 'presets' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white'}\`}>Presets</button>
                     <button onClick={() => setActiveTab("eq")} className={\`px-6 py-3 rounded-full text-[14px] font-bold tracking-wide whitespace-nowrap transition-colors \${activeTab === 'eq' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white'}\`}>Equalizer</button>
                     <button onClick={() => setActiveTab("spatial")} className={\`px-6 py-3 rounded-full text-[14px] font-bold tracking-wide whitespace-nowrap transition-colors \${activeTab === 'spatial' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white'}\`}>Spatial</button>
                     <button onClick={() => setActiveTab("viz")} className={\`px-6 py-3 rounded-full text-[14px] font-bold tracking-wide whitespace-nowrap transition-colors \${activeTab === 'viz' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white'}\`}>Visuals</button>
                   </div>
                   
                   <div className="min-h-[250px]">
                       {activeTab === 'presets' && (
                          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                             {PRESETS.map((p) => (
                               <div key={p.id} onClick={() => applyPreset(p)} className={\`flex-shrink-0 w-[150px] p-6 rounded-[28px] cursor-pointer transition-all snap-start active:scale-95 border \${activePresetId === p.id ? 'bg-[#1A1D27] border-[#0A84FF] shadow-[0_0_20px_rgba(10,132,255,0.2)]' : 'bg-[#12141D] border-white/5 hover:border-white/10'}\`}>
                                 <p className={\`text-[16px] font-bold tracking-tight mb-2 \${activePresetId === p.id ? 'text-[#0A84FF]' : 'text-white'}\`}>{p.name}</p>
                                 <p className="text-[13px] font-medium leading-tight text-gray-500 line-clamp-3">{p.desc}</p>
                               </div>
                             ))}
                          </div>
                       )}

                       {activeTab === 'eq' && (
                          <div className="flex flex-col gap-8">
                             <div className="flex gap-2 justify-between">
                               {eqSettings.map((band, i) => (
                                  <button key={i} onClick={() => setActiveBand(i)} className={\`flex-1 py-3 px-1 text-[12px] rounded-[16px] text-center font-bold tracking-wider uppercase transition-all \${activeBand === i ? 'bg-white text-black shadow-md scale-110' : 'bg-white/5 text-gray-500 hover:text-white'}\`}>
                                    {band.name.replace('Hz','').replace('kHz','k')}
                                  </button>
                               ))}
                             </div>
                             <div className="bg-[#12141D] p-5 rounded-[24px] border border-white/5">
                                 <div className="flex justify-between text-[16px] font-bold tracking-tight text-white px-2 mt-2">
                                   <span className="text-gray-400">{eqSettings[activeBand].name}</span>
                                   <span className={eqSettings[activeBand].g > 0 ? 'text-[#0A84FF]' : 'text-white'}>{eqSettings[activeBand].g > 0 ? "+" : ""}{eqSettings[activeBand].g.toFixed(1)} dB</span>
                                 </div>
                                 <input type="range" min="-12" max="12" step="0.1" value={eqSettings[activeBand].g} onChange={(e) => handleEqChange(activeBand, "g", parseFloat(e.target.value))} className="w-full h-3 mt-6 rounded-full appearance-none bg-white/10 accent-[#0A84FF] outline-none cursor-pointer" />
                             </div>
                          </div>
                       )}
                       
                       {activeTab === 'spatial' && (
                         <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                            <div className="flex flex-col gap-4">
                              <span className="text-[13px] text-gray-400 font-bold tracking-widest uppercase">Sub-Bass</span>
                              <input type="range" min="0" max="1" step="0.05" value={spatialSettings.bassWeight} onChange={(e) => handleSpatialChange("bassWeight", parseFloat(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-white/10 accent-[#0A84FF] outline-none cursor-pointer" />
                            </div>
                            <div className="flex flex-col gap-4">
                              <span className="text-[13px] text-gray-400 font-bold tracking-widest uppercase">Sparkle</span>
                              <input type="range" min="0" max="0.3" step="0.01" value={spatialSettings.clarity} onChange={(e) => handleSpatialChange("clarity", parseFloat(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-white/10 accent-[#0A84FF] outline-none cursor-pointer" />
                            </div>
                            <div className="flex flex-col gap-4">
                              <span className="text-[13px] text-gray-400 font-bold tracking-widest uppercase">Stereo Width</span>
                              <input type="range" min="1.0" max="3.0" step="0.05" value={spatialSettings.wideness} onChange={(e) => handleSpatialChange("wideness", parseFloat(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-white/10 accent-[#0A84FF] outline-none cursor-pointer" />
                            </div>
                            <div className="flex flex-col gap-4">
                              <span className="text-[13px] text-gray-400 font-bold tracking-widest uppercase">Ambience</span>
                              <input type="range" min="0" max="0.5" step="0.01" value={spatialSettings.reverb} onChange={(e) => handleSpatialChange("reverb", parseFloat(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-white/10 accent-[#0A84FF] outline-none cursor-pointer" />
                            </div>
                         </div>
                       )}

                       {activeTab === 'viz' && (
                         <div className="flex flex-col gap-8">
                            <div className="flex flex-col gap-4">
                              <span className="text-[13px] font-bold tracking-widest text-gray-400 uppercase">Color Palette</span>
                              <div className="grid grid-cols-2 gap-3">
                                 {["gold", "ocean", "cyberpunk", "monochrome"].map(palette => (
                                    <button key={palette} onClick={() => setVisSettings(p => ({ ...p, palette }))} className={\`py-5 text-[14px] tracking-widest uppercase font-bold rounded-[20px] transition-all border \${visSettings.palette === palette ? 'bg-[#1A1D27] border-[#0A84FF] text-[#0A84FF] shadow-[0_0_20px_rgba(10,132,255,0.2)] scale-105' : 'bg-[#12141D] border-transparent text-gray-500 hover:text-white hover:bg-white/5'}\`}>{palette}</button>
                                 ))}
                              </div>
                            </div>
                            <div className="flex flex-col gap-4">
                              <span className="text-[13px] font-bold tracking-widest text-gray-400 uppercase">Visual Style</span>
                              <div className="flex gap-3">
                                 {["circular", "cinematic", "spectrum"].map(type => (
                                    <button key={type} onClick={() => setVisSettings(p => ({ ...p, type }))} className={\`flex-1 py-4 text-[13px] tracking-widest uppercase font-bold rounded-[20px] transition-all border \${visSettings.type === type ? 'bg-[#1A1D27] border-[#0A84FF] text-[#0A84FF] shadow-[0_0_20px_rgba(10,132,255,0.2)]' : 'bg-[#12141D] border-transparent text-gray-500 hover:text-white hover:bg-white/5'}\`}>{type.substring(0,4)}</button>
                                 ))}
                              </div>
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
