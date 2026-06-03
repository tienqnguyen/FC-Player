import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const splitToken = '  return (\n    <div className="min-h-[100dvh] bg-black text-white font-sans flex flex-col relative overflow-hidden">';
const splitIndex = content.indexOf(splitToken);

if (splitIndex === -1) {
  console.log("Could not find start index");
  process.exit(1);
}

const newJSX = `  return (
    <div className="min-h-[100dvh] bg-black text-white font-sans flex flex-col relative overflow-hidden">
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
        <header className="px-6 pt-16 pb-6 sticky top-0 z-20">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-transparent pointer-events-none" />
          <div className="relative flex justify-between items-end mb-6">
             <div className="flex flex-col gap-1">
               <h1 className="text-4xl font-black tracking-tighter">HD Audio </h1>
               <p className="text-gray-400 text-sm font-medium tracking-widest uppercase">Studio Player</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0A84FF] to-cyan-400 flex items-center justify-center text-sm font-semibold shadow-[0_0_15px_rgba(10,132,255,0.4)]">
                <Wand2 className="w-5 h-5 text-white" />
             </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-white/50" />
            </div>
            <form onSubmit={handleTiktokFetch}>
              <input
                type="text"
                placeholder="Search TikTok or paste link..."
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-[16px] text-white placeholder:text-white/40 focus:outline-none transition-all shadow-xl backdrop-blur-xl"
                disabled={isFetchingTiktok}
              />
              <button type="submit" className="hidden">Submit</button>
            </form>
          </div>
          
          {isFetchingTiktok && (
             <p className="text-[#0A84FF] text-sm mt-4 flex items-center gap-3 font-medium animate-pulse">
               <div className="w-4 h-4 border-2 border-[#0A84FF]/30 border-t-[#0A84FF] rounded-full animate-spin" />
               Extracting studio quality audio...
             </p>
          )}
          {tiktokError && (
             <p className="text-red-400 text-sm mt-4 font-medium flex items-center gap-2"><Info className="w-4 h-4" /> {tiktokError}</p>
          )}
        </header>

        <main className="px-6 py-2 space-y-10">
          <section>
             <label className="bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all rounded-3xl p-5 flex items-center gap-5 cursor-pointer shadow-xl border border-white/5 backdrop-blur-sm group">
                 <div className="w-14 h-14 bg-gradient-to-br from-[#0A84FF] to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                   <Upload className="w-7 h-7" />
                 </div>
                 <div>
                   <span className="font-bold text-[19px] tracking-tight block text-white mb-0.5">Import Local Audio</span>
                   <span className="text-[14px] text-white/50 font-medium tracking-wide">Enhance your own files</span>
                 </div>
                 <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              </label>
          </section>

          {recentSongs.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold tracking-tight mb-5 px-1 flex items-center justify-between">
                <span>Recent Plays</span>
                {recentSongs.length > 5 && <span className="text-sm font-medium text-[#0A84FF] cursor-pointer hover:underline">See All</span>}
              </h2>
              <div className="flex overflow-x-auto gap-5 pb-6 custom-scrollbar -mx-6 px-6 snap-x">
                {recentSongs.slice(0, 8).map(song => (
                   <div key={song.id} 
                        onClick={() => playRecentSong(song)}
                        className="active:scale-95 transition-transform min-w-[160px] max-w-[160px] cursor-pointer flex-shrink-0 group snap-start">
                      <div className="w-full aspect-square bg-white/5 rounded-[28px] mb-4 flex items-center justify-center shadow-lg relative overflow-hidden border border-white/10 isolate">
                         {song.cover ? (
                            <img src={song.cover} alt="cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:blur-sm" />
                         ) : (
                            <div className="absolute inset-0 bg-gradient-to-tr from-gray-800 to-gray-900 group-hover:blur-sm transition-all duration-700" />
                         )}
                         <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10" />
                         <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                           <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl border border-white/20 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                             <Play className="w-6 h-6 text-white fill-white ml-1" />
                           </div>
                         </div>
                         {!song.cover && <Music className="w-12 h-12 text-white/30 z-0 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                      </div>
                      <p className="font-bold text-[16px] tracking-tight text-white truncate px-1">{song.title}</p>
                      <p className="text-white/50 text-[14px] font-medium truncate mt-0.5 px-1">{song.author || "TikTok Audio"}</p>
                   </div>
                ))}
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

        {/* Global Immersive Visualizer (Shows only when expanded) */}
        <div className={\`absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-1000 \${isExpanded ? 'opacity-100 z-0' : 'opacity-0 z-0'}\`}>
           {/* Fallback ambient color if no artwork */}
           <div className="absolute inset-0 bg-black" />
           {currentSong?.cover && (
              <img src={currentSong.cover} className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-125" alt="bg" />
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80" />
           <Visualizer 
             analyser={analyser} 
             isPlaying={isPlaying} 
             settings={{...visSettings, glowStrength: 5, colorIntensity: 1.5, type: visSettings.type === 'cinematic' ? 'cinematic' : 'circular'}} 
             className="absolute inset-0 w-full h-full opacity-60 mix-blend-screen"
           />
        </div>

        {!isExpanded && (
          /* MINIPLAYER */
          <div className="flex flex-col relative z-20">
            <div className="relative px-3 pb-safe pt-2">
              {audioUrl && (
                <div 
                  onClick={() => setIsExpanded(true)}
                  className="bg-[#1c1c1e]/90 hover:bg-[#2c2c2e]/90 md:mx-auto md:max-w-screen-md mx-auto w-full rounded-[24px] flex items-center justify-between p-2.5 cursor-pointer shadow-2xl mb-3 transition-all backdrop-blur-2xl border border-white/10"
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1 relative z-10">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl shadow-inner overflow-hidden flex items-center justify-center flex-shrink-0 relative border border-white/5">
                       {currentSong?.cover ? (
                          <img src={currentSong.cover} className="w-full h-full object-cover relative z-10 animate-in fade-in" alt="cover" />
                       ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 z-10" />
                       )}
                       <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen z-20"><Visualizer analyser={analyser} isPlaying={isPlaying} settings={{...visSettings, palette: 'monochrome', type: 'oscilloscope'}} className="w-full h-full" /></div>
                    </div>
                    <div className="flex-1 min-w-0 pr-2 flex flex-col justify-center">
                       <div className="text-[15px] font-bold tracking-tight truncate text-white">{fileName || "Unknown Track"}</div>
                       <div className="text-[13px] text-white/50 font-medium tracking-wide truncate">{currentSong?.author ? (isSignatureSound ? currentSong.author + " • HD Audio" : currentSong.author) : (isSignatureSound ? "HD Enhanced" : "Original")}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 pr-3 z-10">
                     <button 
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        className="text-white hover:scale-110 active:scale-95 transition-transform w-10 h-10 flex items-center justify-center bg-white/10 rounded-full"
                     >
                        {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                     </button>
                     <button onClick={(e) => { e.stopPropagation(); handleNextSong(); }} className="text-white/70 hover:text-white hover:scale-110 active:scale-95 transition-all w-8 h-8 flex items-center justify-center">
                        <SkipForward className="w-6 h-6 fill-current" />
                     </button>
                  </div>
                  
                  <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-white/10 rounded-full overflow-hidden pointer-events-none md:max-w-screen-md md:mx-auto mx-2 z-20">
                     <div className="h-full bg-gradient-to-r from-[#0A84FF] to-cyan-400 transition-all duration-150" style={{ width: \`\${progress}%\` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isExpanded && (
          /* EXPANDED PLAYER */
          <div className="h-full w-full flex flex-col px-6 py-10 relative z-10 overflow-y-auto custom-scrollbar">
             
             {/* Header */}
             <div className="relative z-10 flex justify-between items-center mb-8 shrink-0">
                <button onClick={() => setIsExpanded(false)} className="w-12 h-12 bg-white/5 hover:bg-white/15 active:scale-95 rounded-full flex items-center justify-center transition-all backdrop-blur-2xl border border-white/10">
                   <ChevronDown className="w-7 h-7 text-white" />
                </button>
                <div className="flex flex-col items-center">
                   <span className="text-[11px] font-black text-white/50 tracking-[0.2em] uppercase mb-0.5">PLAYING FROM</span>
                   <span className="text-[13px] font-bold text-white tracking-wide">{isSignatureSound ? 'Studio Engine' : 'Library'}</span>
                </div>
                <button className="w-12 h-12 bg-white/5 hover:bg-white/15 active:scale-95 rounded-full flex items-center justify-center transition-all backdrop-blur-2xl border border-white/10">
                   <MoreHorizontal className="w-6 h-6 text-white" />
                </button>
             </div>

             {/* Artwork */}
             <div className="relative z-10 mb-12 w-full flex-1 max-h-[45vh] min-h-[300px] flex items-center justify-center transition-transform duration-700">
                <div className={\`w-full max-w-[380px] aspect-square rounded-[40px] flex items-center justify-center relative group transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] \${isPlaying ? 'scale-100 shadow-[0_40px_80px_rgba(0,0,0,0.5)]' : 'scale-[0.92] shadow-[0_20px_40px_rgba(0,0,0,0.3)]'}\`}>
                   <div className="absolute inset-0 rounded-[40px] overflow-hidden border border-white/10 backdrop-blur-sm z-20">
                     {currentSong?.cover ? (
                       <img src={currentSong.cover} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
                     ) : (
                       <div className="absolute inset-0 bg-gradient-to-tr from-gray-800 to-gray-950 flex items-center justify-center">
                         <Music className="w-24 h-24 text-white/10" />
                       </div>
                     )}
                   </div>
                   
                   {/* HD Switcher inside Artwork Area */}
                   <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-30">
                      <div className="bg-black/60 backdrop-blur-3xl rounded-full p-1.5 flex items-center border border-white/10 shadow-2xl">
                         <button 
                           onClick={() => { resumeContext(); toggleSignatureSound(false); }}
                           className={\`px-6 py-2.5 text-[14px] font-bold tracking-tight rounded-full transition-all \${!isSignatureSound ? 'bg-white text-black shadow-lg scale-105' : 'text-white/60 hover:text-white'}\`}
                         >Normal</button>
                         <button 
                           onClick={() => { resumeContext(); toggleSignatureSound(true); }}
                           className={\`px-6 py-2.5 text-[14px] font-bold tracking-tight rounded-full flex gap-2 items-center transition-all \${isSignatureSound ? 'bg-gradient-to-r from-[#0A84FF] to-cyan-400 text-white shadow-[0_0_20px_rgba(10,132,255,0.5)] scale-105' : 'text-white/60 hover:text-white'}\`}
                         ><Sparkles className="w-4 h-4" />HD Audio</button>
                      </div>
                   </div>
                </div>
             </div>

             <div className="flex-1" />

             {/* Track Info */}
             <div className="relative z-10 mb-6 flex justify-between items-end shrink-0 px-2 mt-4">
                <div className="flex-1 min-w-0 pr-4">
                   <h2 className="text-[32px] font-black tracking-tighter text-white truncate mb-1 leading-none">{fileName || "Unknown Track"}</h2>
                   <p className="text-white/60 text-[18px] font-medium tracking-tight truncate flex items-center gap-2">
                     {currentSong?.author || "Custom Audio Import"}
                     {isSignatureSound && <span className="bg-[#0A84FF] text-white text-[10px] font-black px-2 py-0.5 rounded-[4px] tracking-widest uppercase">Lossless</span>}
                   </p>
                </div>
                <button className="text-white hover:text-red-500 hover:scale-110 transition-all p-2 bg-white/5 rounded-full backdrop-blur-xl border border-white/5">
                   <Heart className="w-6 h-6" />
                </button>
             </div>

             {/* Progress / Seek */}
             <div className="relative z-10 mb-8 shrink-0 px-2 group">
                <div 
                  className="w-full h-2 bg-white/20 rounded-full cursor-pointer flex items-center relative py-4 -my-4"
                  onClick={(e) => {
                    if (audioRef.current && !isNaN(audioRef.current.duration)) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = (e.clientX - rect.left) / rect.width;
                      audioRef.current.currentTime = pos * audioRef.current.duration;
                    }
                  }}
                >
                   <div className="absolute left-0 top-[calc(50%-4px)] h-2 bg-gradient-to-r from-white/80 to-white transition-colors rounded-full pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: \`\${progress}%\` }}>
                     <div className="w-5 h-5 bg-white rounded-full absolute -right-2.5 top-1/2 -translate-y-1/2 shadow-xl scale-0 group-hover:scale-100 transition-transform duration-200"></div>
                   </div>
                </div>
                <div className="flex justify-between mt-3 text-[14px] text-white/50 font-bold tracking-wide tabular-nums">
                   <span>{audioRef.current ? formatDurationDisplay(audioRef.current.currentTime) : "0:00"}</span>
                   <span className="flex items-center gap-2">
                     <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded tracking-widest">{formatSampleRateDisplay(sampleRate)}</span>
                     {formatDurationDisplay(duration)}
                   </span>
                </div>
             </div>

             {/* Playback Controls */}
             <div className="relative z-10 flex justify-center items-center gap-12 mb-10 shrink-0">
                <button onClick={handlePrevSong} className="text-white hover:text-white/70 active:scale-95 transition-all w-12 h-12 flex items-center justify-center">
                   <SkipBack className="w-10 h-10 fill-white" />
                </button>
                <button 
                  onClick={togglePlay}
                  className="w-[96px] h-[96px] bg-white rounded-[32px] flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.25)]"
                >
                  {isPlaying ? <Pause className="w-12 h-12 fill-black" /> : <Play className="w-12 h-12 fill-black ml-1.5" />}
                </button>
                <button onClick={handleNextSong} className="text-white hover:text-white/70 active:scale-95 transition-all w-12 h-12 flex items-center justify-center">
                   <SkipForward className="w-10 h-10 fill-white" />
                </button>
             </div>
             
             {/* Bottom Tools Row */}
             <div className="relative z-10 flex justify-between items-center shrink-0 px-4 bg-black/20 backdrop-blur-3xl rounded-[32px] py-2 border border-white/10 mb-safe">
                <button 
                  className={\`hover:bg-white/10 rounded-[28px] p-4 flex-1 flex flex-col items-center gap-1 transition-all active:scale-95 \${showTuning ? 'text-[#0A84FF] bg-[#0A84FF]/10' : 'text-white/60'}\`} 
                  onClick={() => setShowTuning(!showTuning)}
                >
                   <SlidersHorizontal className="w-6 h-6" />
                   <span className="text-[10px] font-bold tracking-widest uppercase">Tune</span>
                </button>
                <div className="w-px h-8 bg-white/10 mx-2" />
                <button className="hover:bg-white/10 rounded-[28px] p-4 flex-1 flex flex-col items-center gap-1 text-white/60 transition-all active:scale-95">
                   <ListMusic className="w-6 h-6" />
                   <span className="text-[10px] font-bold tracking-widest uppercase">Queue</span>
                </button>
                <div className="w-px h-8 bg-white/10 mx-2" />
                <button onClick={handleExport} className={\`hover:bg-white/10 rounded-[28px] p-4 flex-1 flex flex-col items-center gap-1 transition-all active:scale-95 \${isExporting ? 'animate-pulse text-[#0A84FF]' : 'text-white/60'}\`}>
                   <Download className="w-6 h-6" />
                   <span className="text-[10px] font-bold tracking-widest uppercase">Save</span>
                </button>
             </div>

             {/* Tuning Panel (Overlaid modal style) */}
             {showTuning && (
                <div className="absolute bottom-32 left-4 right-4 z-40 bg-[#1c1c1e]/90 backdrop-blur-3xl rounded-[40px] p-6 shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-8 duration-500 max-h-[50vh] overflow-y-auto custom-scrollbar">
                   <div className="flex justify-between items-center mb-6">
                     <span className="text-[15px] font-black tracking-widest text-white flex items-center gap-2"><Zap className="w-5 h-5 text-[#0A84FF] fill-[#0A84FF]" /> STUDIO DSP</span>
                     <button onClick={() => setShowTuning(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><ChevronDown className="w-5 h-5 text-white" /></button>
                   </div>
                   <div className="flex gap-2 mb-6 overflow-x-auto custom-scrollbar pb-2">
                     <button onClick={() => setActiveTab("presets")} className={\`px-6 py-2.5 rounded-full text-[14px] font-bold tracking-tight whitespace-nowrap transition-colors \${activeTab === 'presets' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'}\`}>Presets</button>
                     <button onClick={() => setActiveTab("eq")} className={\`px-6 py-2.5 rounded-full text-[14px] font-bold tracking-tight whitespace-nowrap transition-colors \${activeTab === 'eq' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'}\`}>EQ</button>
                     <button onClick={() => setActiveTab("spatial")} className={\`px-6 py-2.5 rounded-full text-[14px] font-bold tracking-tight whitespace-nowrap transition-colors \${activeTab === 'spatial' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'}\`}>Spatial</button>
                     <button onClick={() => setActiveTab("viz")} className={\`px-6 py-2.5 rounded-full text-[14px] font-bold tracking-tight whitespace-nowrap transition-colors \${activeTab === 'viz' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'}\`}>Visuals</button>
                   </div>
                   
                   {activeTab === 'presets' && (
                      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                         {PRESETS.map((p) => (
                           <div key={p.id} onClick={() => applyPreset(p)} className={\`flex-shrink-0 w-[150px] p-5 rounded-[28px] cursor-pointer transition-all snap-start active:scale-95 \${activePresetId === p.id ? 'bg-gradient-to-br from-white to-gray-200 text-black shadow-xl scale-105' : 'bg-white/5 hover:bg-white/10 border border-white/5'}\`}>
                             <div className={\`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 shadow-sm \${activePresetId === p.id ? 'bg-black text-white' : 'bg-white/10 text-white'}\`}>
                               <p.icon className="w-5 h-5" />
                             </div>
                             <p className={\`text-[16px] font-black tracking-tighter mb-1.5 leading-tight \${activePresetId === p.id ? 'text-black' : 'text-white'}\`}>{p.name}</p>
                             <p className={\`text-[12px] font-medium leading-normal line-clamp-3 \${activePresetId === p.id ? 'text-gray-700' : 'text-white/50'}\`}>{p.desc}</p>
                           </div>
                         ))}
                      </div>
                   )}

                   {activeTab === 'eq' && (
                      <div className="flex flex-col gap-6">
                         <div className="flex gap-1.5 justify-between mb-2">
                           {eqSettings.map((band, i) => (
                              <button key={i} onClick={() => setActiveBand(i)} className={\`flex-1 py-3 px-1 text-[11px] rounded-2xl text-center font-bold tracking-widest uppercase transition-all \${activeBand === i ? 'bg-white text-black shadow-lg scale-110 z-10' : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/5'}\`}>
                                {band.name.substring(0, 3)}
                              </button>
                           ))}
                         </div>
                         <div className="flex justify-between text-[15px] font-bold tracking-tight text-white px-2 mt-4">
                           <span>{eqSettings[activeBand].name} ({eqSettings[activeBand].f}Hz)</span>
                           <span className={eqSettings[activeBand].g > 0 ? 'text-[#0A84FF]' : 'text-white'}>{eqSettings[activeBand].g > 0 ? "+" : ""}{eqSettings[activeBand].g.toFixed(1)} dB</span>
                         </div>
                         <input type="range" min="-12" max="12" step="0.1" value={eqSettings[activeBand].g} onChange={(e) => handleEqChange(activeBand, "g", parseFloat(e.target.value))} className="w-full h-3 rounded-full appearance-none bg-white/10 accent-white outline-none cursor-pointer" />
                      </div>
                   )}
                   
                   {activeTab === 'spatial' && (
                     <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                        <div className="flex flex-col gap-3">
                          <span className="text-[13px] text-white font-bold tracking-widest uppercase">Sub-Bass</span>
                          <input type="range" min="0" max="1" step="0.05" value={spatialSettings.bassWeight} onChange={(e) => handleSpatialChange("bassWeight", parseFloat(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-white/10 accent-white outline-none cursor-pointer" />
                        </div>
                        <div className="flex flex-col gap-3">
                          <span className="text-[13px] text-white font-bold tracking-widest uppercase">Sparkle</span>
                          <input type="range" min="0" max="0.3" step="0.01" value={spatialSettings.clarity} onChange={(e) => handleSpatialChange("clarity", parseFloat(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-white/10 accent-white outline-none cursor-pointer" />
                        </div>
                        <div className="flex flex-col gap-3">
                          <span className="text-[13px] text-white font-bold tracking-widest uppercase">Width</span>
                          <input type="range" min="1.0" max="3.0" step="0.05" value={spatialSettings.wideness} onChange={(e) => handleSpatialChange("wideness", parseFloat(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-white/10 accent-white outline-none cursor-pointer" />
                        </div>
                        <div className="flex flex-col gap-3">
                          <span className="text-[13px] text-white font-bold tracking-widest uppercase">Ambience</span>
                          <input type="range" min="0" max="0.5" step="0.01" value={spatialSettings.reverb} onChange={(e) => handleSpatialChange("reverb", parseFloat(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-white/10 accent-white outline-none cursor-pointer" />
                        </div>
                     </div>
                   )}

                   {activeTab === 'viz' && (
                     <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-3">
                          <span className="text-[13px] font-bold tracking-widest text-white/50 uppercase">Color Palette</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                             {["gold", "cyberpunk", "ocean", "monochrome"].map(palette => (
                                <button key={palette} onClick={() => setVisSettings(p => ({ ...p, palette }))} className={\`py-3 text-[13px] tracking-widest uppercase font-bold rounded-xl transition-all \${visSettings.palette === palette ? 'bg-white text-black shadow-lg scale-105 z-10' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/5'}\`}>{palette}</button>
                             ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-3">
                          <span className="text-[13px] font-bold tracking-widest text-white/50 uppercase">Effect Engine</span>
                          <div className="flex gap-2">
                             {["spectrum", "oscilloscope", "circular"].map(type => (
                                <button key={type} onClick={() => setVisSettings(p => ({ ...p, type }))} className={\`flex-1 py-3 px-1 text-[13px] tracking-widest uppercase font-bold rounded-xl transition-all \${visSettings.type === type ? 'bg-white text-black shadow-lg scale-105 z-10' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/5'}\`}>{type.substring(0,4)}</button>
                             ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 mt-2">
                          <span className="text-[13px] font-bold tracking-widest text-white/50 uppercase">Intensity</span>
                          <input type="range" min="0.5" max="3.0" step="0.1" value={visSettings.colorIntensity} onChange={(e) => setVisSettings(p => ({...p, colorIntensity: parseFloat(e.target.value)}))} className="w-full h-2 rounded-full appearance-none bg-white/10 accent-white outline-none cursor-pointer" />
                        </div>
                     </div>
                   )}
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
console.log("Successfully thoroughly redesigned UI");
