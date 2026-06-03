import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const splitToken = '  return (\n    <div className="min-h-[100dvh] bg-[#121212] text-white font-sans flex flex-col relative overflow-hidden">';
const splitIndex = content.indexOf(splitToken);

if (splitIndex === -1) {
  console.log("Could not find start index");
  process.exit(1);
}

const newJSX = `  return (
    <div className="min-h-[100dvh] bg-black text-white font-sans flex flex-col relative overflow-hidden">
      {audioError && (
        <div className="absolute top-0 left-0 w-full bg-red-900/90 text-white p-2 z-[60] text-xs font-mono break-words">
          <strong>ERROR INITIALIZING HD PIPELINE:</strong> {audioError}
        </div>
      )}

      {/* --- Main "Home" View --- */}
      <div 
        className={\`flex-1 overflow-y-auto pb-32 transition-opacity duration-300 \${
          isExpanded ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100"
        }\`}
      >
        <header className="px-6 pt-16 pb-4 bg-black/80 backdrop-blur-xl sticky top-0 z-20 border-b border-white/10">
          <div className="flex justify-between items-end mb-4">
            <h1 className="text-3xl font-bold tracking-tight">Library</h1>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-[#0A84FF] flex items-center justify-center text-sm font-semibold shadow-lg"></div>
            </div>
          </div>
          
          <div className="relative mt-2">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <form onSubmit={handleTiktokFetch}>
              <input
                type="text"
                placeholder="Search or paste TikTok link"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                className="w-full bg-[#1c1c1e] hover:bg-[#2c2c2e] focus:bg-[#2c2c2e] border border-transparent rounded-xl py-2 pl-10 pr-4 text-[15px] text-white placeholder:text-gray-400 focus:outline-none transition-colors shadow-sm"
                disabled={isFetchingTiktok}
              />
              <button type="submit" className="hidden">Submit</button>
            </form>
          </div>
          
          {isFetchingTiktok && (
             <p className="text-[#0A84FF] text-xs mt-3 flex items-center gap-2 font-medium">
               <div className="w-3 h-3 border-2 border-[#0A84FF]/30 border-t-[#0A84FF] rounded-full animate-spin" />
               Searching TikTok audio...
             </p>
          )}
          {tiktokError && (
             <p className="text-red-400 text-xs mt-3">{tiktokError}</p>
          )}
        </header>

        <main className="px-6 py-6 space-y-8">
          <section>
             <label className="bg-[#1c1c1e] hover:bg-[#2c2c2e] active:scale-[0.98] transition-all rounded-2xl p-4 flex items-center gap-4 cursor-pointer shadow-sm">
                 <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-[#0A84FF]">
                   <Upload className="w-6 h-6" />
                 </div>
                 <div>
                   <span className="font-semibold text-[17px] tracking-tight block text-white">Upload File</span>
                   <span className="text-sm text-gray-400">Import audio from device</span>
                 </div>
                 <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              </label>
          </section>

          {recentSongs.length > 0 && (
            <section>
              <h2 className="text-xl font-bold tracking-tight mb-4">Recently Added</h2>
              <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar -mx-6 px-6">
                {recentSongs.map(song => (
                   <div key={song.id} 
                        onClick={() => playRecentSong(song)}
                        className="active:scale-95 transition-transform min-w-[140px] max-w-[140px] cursor-pointer flex-shrink-0 group">
                      <div className="w-full aspect-square bg-[#1c1c1e] rounded-2xl mb-3 flex items-center justify-center shadow-md relative overflow-hidden border border-white/5">
                         {song.cover ? (
                            <img src={song.cover} alt="cover" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                         ) : (
                            <Music className="w-10 h-10 text-gray-500" />
                         )}
                         <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors pointer-events-none" />
                         <div className="absolute bottom-2 right-2 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                           <Play className="w-4 h-4 text-black fill-black ml-0.5" />
                         </div>
                      </div>
                      <p className="font-semibold text-[15px] tracking-tight text-white truncate">{song.title}</p>
                      <p className="text-gray-400 text-[13px] truncate mt-0.5">{song.author || "TikTok Audio"}</p>
                   </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-bold tracking-tight mb-4">All Imports</h2>
            <div className="flex flex-col gap-3">
               {recentSongs.slice(0, 10).map(song => (
                  <div key={song.id} 
                       onClick={() => playRecentSong(song)}
                       className="flex items-center gap-3 p-3 bg-[#1c1c1e] active:scale-[0.98] rounded-2xl cursor-pointer group transition-all shadow-sm">
                     <div className="w-14 h-14 bg-[#2c2c2e] rounded-xl flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                        {song.cover ? (
                          <img src={song.cover} alt="cover" className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-6 h-6 text-gray-500" />
                        )}
                        <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                           <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                     </div>
                     <div className="flex-1 min-w-0 pr-2">
                        <p className="text-white text-[16px] font-semibold truncate tracking-tight">{song.title}</p>
                        <p className="text-gray-400 text-[14px] truncate">{song.author || song.originalUrl}</p>
                     </div>
                     <div className="px-2">
                        <button onClick={(e) => deleteRecentSong(song.id, e)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-white/5 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                     </div>
                  </div>
               ))}
               {recentSongs.length === 0 && (
                 <div className="text-gray-500 text-center text-[15px] py-10 bg-[#1c1c1e] rounded-2xl border border-dashed border-gray-600">
                    No recent tracks. Paste a link to get started!
                 </div>
               )}
            </div>
          </section>
          
          <div className="h-20"></div>
        </main>
      </div>

      {/* --- Global Bottom Mini-Player OR Expanded Player --- */}
      <div 
        className={\`fixed bottom-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-3xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col border-t border-white/10 \${
           isExpanded ? "h-[100dvh] translate-y-0 border-transparent bg-black" : "h-auto translate-y-0"
        }\`}
      >
        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onLoadedMetadata={handleLoadedMetadata}
          crossOrigin="anonymous"
          className="hidden"
        />

        {!isExpanded && (
          /* MINIPLAYER */
          <div className="flex flex-col">
            <div className="relative px-3 pb-safe pt-2">
              {audioUrl && (
                <div 
                  onClick={() => setIsExpanded(true)}
                  className="bg-white/10 hover:bg-white/15 active:bg-white/20 md:mx-auto md:max-w-screen-md mx-auto w-full rounded-2xl flex items-center justify-between p-2.5 cursor-pointer shadow-lg mb-2 transition-all backdrop-blur-3xl"
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <div className="w-11 h-11 bg-white/5 rounded-xl shadow-inner overflow-hidden flex items-center justify-center flex-shrink-0 group relative border border-white/5">
                       <div className="absolute inset-0 opacity-10"><Visualizer analyser={analyser} isPlaying={isPlaying} settings={visSettings} /></div>
                       {currentSong?.cover ? (
                          <img src={currentSong.cover} className="w-full h-full object-cover relative z-10" alt="cover" />
                       ) : (
                          <Music className="w-5 h-5 text-gray-400 z-10 relative" />
                       )}
                    </div>
                    <div className="flex-1 min-w-0 pr-2 flex flex-col justify-center">
                       <div className="text-[15px] font-semibold tracking-tight truncate text-white">{fileName || "Unknown Track"}</div>
                       <div className="text-[13px] text-gray-400 truncate">{currentSong?.author ? (isSignatureSound ? currentSong.author + " (HD)" : currentSong.author) : (isSignatureSound ? "HD Enhanced" : "Original")}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0 pr-3">
                     <button 
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        className="text-white hover:scale-110 active:scale-95 transition-transform"
                     >
                        {isPlaying ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white ml-0.5" />}
                     </button>
                     <button onClick={(e) => { e.stopPropagation(); handleNextSong(); }} className="text-white hover:scale-110 active:scale-95 transition-transform">
                        <SkipForward className="w-6 h-6 fill-white" />
                     </button>
                  </div>
                  
                  <div className="absolute bottom-[-1px] left-8 right-8 h-[2px] bg-white/10 rounded-full overflow-hidden pointer-events-none md:max-w-screen-md md:mx-auto mx-2">
                     <div className="h-full bg-white transition-all duration-100" style={{ width: \`\${progress}%\` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isExpanded && (
          /* EXPANDED PLAYER */
          <div className="h-full w-full bg-black flex flex-col px-6 py-8 overflow-y-auto custom-scrollbar relative">
             
             {/* Dynamic gradient background based on artwork (simulated here with CSS) */}
             <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                 <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[140%] bg-gradient-to-b from-[#1c1c1e] to-black opacity-60 blur-3xl rounded-full mix-blend-screen" />
                 <Visualizer analyser={analyser} isPlaying={isPlaying} settings={{...visSettings, palette: "monochrome", glowStrength: 20}} />
             </div>

             {/* Header */}
             <div className="relative z-10 flex justify-between items-center mb-8 shrink-0">
                <button onClick={() => setIsExpanded(false)} className="bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full p-2.5 transition-colors backdrop-blur-md">
                   <ChevronDown className="w-6 h-6 text-white" />
                </button>
                <div className="text-xs font-bold text-gray-400 tracking-widest text-center uppercase">
                   {isSignatureSound ? 'HD Engine Active' : 'Now Playing'}
                </div>
                <button className="bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full p-2.5 transition-colors backdrop-blur-md">
                   <MoreHorizontal className="w-6 h-6 text-white" />
                </button>
             </div>

             {/* Artwork */}
             <div className="relative z-10 mb-10 w-full flex-1 min-h-[250px] flex items-center justify-center transition-transform duration-500">
                <div className={\`w-full max-w-[360px] aspect-square rounded-[36px] flex items-center justify-center relative overflow-hidden group transition-all duration-500 ease-out \${isPlaying ? 'scale-100 shadow-[0_30px_60px_rgba(0,0,0,0.8)]' : 'scale-90 shadow-[0_20px_40px_rgba(0,0,0,0.6)]'}\`}>
                   {currentSong?.cover ? (
                     <img src={currentSong.cover} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
                   ) : (
                     <div className="absolute inset-0 bg-gradient-to-tr from-gray-800 to-gray-900 flex items-center justify-center">
                       <Music className="w-24 h-24 text-black/20" />
                     </div>
                   )}
                   
                   {/* Overlay Switcher Container */}
                   <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
                      <div className="bg-black/40 backdrop-blur-2xl rounded-full p-1.5 flex items-center border border-white/10 shadow-2xl">
                         <button 
                           onClick={() => { resumeContext(); toggleSignatureSound(false); }}
                           className={\`px-5 py-2 text-[13px] font-semibold tracking-tight rounded-full transition-all \${!isSignatureSound ? 'bg-white text-black shadow-md' : 'text-gray-300 hover:text-white'}\`}
                         >Original</button>
                         <button 
                           onClick={() => { resumeContext(); toggleSignatureSound(true); }}
                           className={\`px-5 py-2 text-[13px] font-semibold tracking-tight rounded-full flex gap-1.5 items-center transition-all \${isSignatureSound ? 'bg-[#0A84FF] text-white shadow-[0_0_20px_rgba(10,132,255,0.4)]' : 'text-gray-300 hover:text-white'}\`}
                         ><Sparkles className="w-4 h-4" />HD Enhanced</button>
                      </div>
                   </div>
                </div>
             </div>

             {/* Track Info */}
             <div className="relative z-10 mb-8 flex justify-between items-start shrink-0 px-2">
                <div className="flex-1 min-w-0 pr-4">
                   <h2 className="text-[28px] font-bold tracking-tight text-white truncate mb-1 leading-tight">{fileName || "Unknown Track"}</h2>
                   <p className="text-[#0A84FF] text-[18px] tracking-tight truncate">{currentSong?.author || "Custom Audio Import"}</p>
                </div>
                <button className="text-white/60 hover:text-white p-2">
                   <MoreHorizontal className="w-7 h-7" />
                </button>
             </div>

             {/* Progress / Seek */}
             <div className="relative z-10 mb-8 shrink-0 px-2">
                <div 
                  className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer flex items-center relative group py-3 -my-3"
                  onClick={(e) => {
                    if (audioRef.current && !isNaN(audioRef.current.duration)) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = (e.clientX - rect.left) / rect.width;
                      audioRef.current.currentTime = pos * audioRef.current.duration;
                    }
                  }}
                >
                   <div className="absolute left-0 top-[calc(50%-3px)] h-1.5 bg-white transition-colors rounded-full pointer-events-none" style={{ width: \`\${progress}%\` }}>
                     <div className="w-4 h-4 bg-white rounded-full absolute -right-2 top-1/2 -translate-y-1/2 shadow-lg scale-0 group-hover:scale-100 transition-transform"></div>
                   </div>
                </div>
                <div className="flex justify-between mt-3 text-[13px] text-white/50 font-medium tracking-wide tabular-nums">
                   <span>{audioRef.current ? formatDurationDisplay(audioRef.current.currentTime) : "0:00"}</span>
                   <span>{formatDurationDisplay(duration)}</span>
                </div>
             </div>

             {/* Playback Controls */}
             <div className="relative z-10 flex justify-center items-center gap-10 mb-10 shrink-0">
                <button onClick={handlePrevSong} className="text-white hover:text-white/70 active:scale-95 transition-all">
                   <SkipBack className="w-10 h-10 fill-white" />
                </button>
                <button 
                  onClick={togglePlay}
                  className="w-[84px] h-[84px] bg-white rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform shadow-[0_10px_30px_rgba(255,255,255,0.2)]"
                >
                  {isPlaying ? <Pause className="w-10 h-10 fill-black" /> : <Play className="w-10 h-10 fill-black ml-1.5" />}
                </button>
                <button onClick={handleNextSong} className="text-white hover:text-white/70 active:scale-95 transition-all">
                   <SkipForward className="w-10 h-10 fill-white" />
                </button>
             </div>
             
             {/* Bottom Tools Row */}
             <div className="relative z-10 flex justify-between items-center mb-6 shrink-0 px-6">
                <button 
                  className={\`hover:bg-white/10 p-3 rounded-full transition-colors active:scale-95 \${showTuning ? 'text-[#0A84FF] bg-[#0A84FF]/10' : 'text-white/60'}\`} 
                  onClick={() => setShowTuning(!showTuning)}
                >
                   <SlidersHorizontal className="w-6 h-6" />
                </button>
                <button onClick={handleExport} className={\`hover:bg-white/10 p-3 rounded-full transition-colors active:scale-95 \${isExporting ? 'animate-pulse text-[#0A84FF]' : 'text-white/60'}\`}>
                   <Download className="w-6 h-6" />
                </button>
             </div>

             {/* Tuning Panel */}
             {showTuning && (
                <div className="relative z-10 bg-[#1c1c1e] rounded-3xl p-5 mb-4 shadow-xl border border-white/5 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
                   <div className="flex justify-between items-center mb-5">
                     <span className="text-[13px] font-bold tracking-widest text-white/50 uppercase"><Zap className="inline w-3.5 h-3.5 mr-1 mb-0.5 text-[#0A84FF]" /> Studio DSP</span>
                   </div>
                   <div className="flex gap-2 mb-5 overflow-x-auto custom-scrollbar pb-2">
                     <button onClick={() => setActiveTab("presets")} className={\`px-4 py-2 rounded-full text-[13px] font-bold tracking-tight whitespace-nowrap transition-colors \${activeTab === 'presets' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'}\`}>Presets</button>
                     <button onClick={() => setActiveTab("eq")} className={\`px-4 py-2 rounded-full text-[13px] font-bold tracking-tight whitespace-nowrap transition-colors \${activeTab === 'eq' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'}\`}>EQ</button>
                     <button onClick={() => setActiveTab("spatial")} className={\`px-4 py-2 rounded-full text-[13px] font-bold tracking-tight whitespace-nowrap transition-colors \${activeTab === 'spatial' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'}\`}>Spatial</button>
                     <button onClick={() => setActiveTab("viz")} className={\`px-4 py-2 rounded-full text-[13px] font-bold tracking-tight whitespace-nowrap transition-colors \${activeTab === 'viz' ? 'bg-white text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'}\`}>Visualizer</button>
                   </div>
                   
                   {activeTab === 'presets' && (
                      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                         {PRESETS.map((p) => (
                           <div key={p.id} onClick={() => applyPreset(p)} className={\`flex-shrink-0 w-[130px] p-4 rounded-2xl cursor-pointer transition-all active:scale-95 \${activePresetId === p.id ? 'bg-white text-black shadow-lg' : 'bg-white/5 hover:bg-white/10 border border-white/5'}\`}>
                             <p className={\`text-[15px] font-bold tracking-tight truncate mb-1 \${activePresetId === p.id ? 'text-black' : 'text-white'}\`}>{p.name}</p>
                             <p className={\`text-[12px] leading-tight line-clamp-2 \${activePresetId === p.id ? 'text-gray-600' : 'text-white/50'}\`}>{p.desc}</p>
                           </div>
                         ))}
                      </div>
                   )}

                   {activeTab === 'eq' && (
                      <div className="flex flex-col gap-5">
                         <div className="flex gap-1 justify-between mb-2">
                           {eqSettings.map((band, i) => (
                              <button key={i} onClick={() => setActiveBand(i)} className={\`flex-1 py-1.5 px-1 text-[11px] rounded-lg text-center font-bold tracking-tight transition-colors \${activeBand === i ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}\`}>
                                {band.name}
                              </button>
                           ))}
                         </div>
                         <div className="flex justify-between text-[13px] font-medium text-white/70 px-1">
                           <span>Gain: {eqSettings[activeBand].g > 0 ? "+" : ""}{eqSettings[activeBand].g.toFixed(1)} dB</span>
                           <span>{eqSettings[activeBand].name} ({eqSettings[activeBand].f}Hz)</span>
                         </div>
                         <input type="range" min="-12" max="12" step="0.1" value={eqSettings[activeBand].g} onChange={(e) => handleEqChange(activeBand, "g", parseFloat(e.target.value))} className="w-full h-2 rounded-full appearance-none bg-white/20 accent-white outline-none" />
                      </div>
                   )}
                   
                   {activeTab === 'spatial' && (
                     <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                        <div className="flex flex-col gap-2">
                          <span className="text-[12px] text-white/50 font-bold tracking-wider uppercase">Sub-Bass</span>
                          <input type="range" min="0" max="1" step="0.05" value={spatialSettings.bassWeight} onChange={(e) => handleSpatialChange("bassWeight", parseFloat(e.target.value))} className="w-full h-1.5 rounded-full appearance-none bg-white/20 accent-white outline-none" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className="text-[12px] text-white/50 font-bold tracking-wider uppercase">Sparkle</span>
                          <input type="range" min="0" max="0.3" step="0.01" value={spatialSettings.clarity} onChange={(e) => handleSpatialChange("clarity", parseFloat(e.target.value))} className="w-full h-1.5 rounded-full appearance-none bg-white/20 accent-white outline-none" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className="text-[12px] text-white/50 font-bold tracking-wider uppercase">Width</span>
                          <input type="range" min="1.0" max="3.0" step="0.05" value={spatialSettings.wideness} onChange={(e) => handleSpatialChange("wideness", parseFloat(e.target.value))} className="w-full h-1.5 rounded-full appearance-none bg-white/20 accent-white outline-none" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className="text-[12px] text-white/50 font-bold tracking-wider uppercase">Absorb Room</span>
                          <input type="range" min="0" max="0.5" step="0.01" value={spatialSettings.reverb} onChange={(e) => handleSpatialChange("reverb", parseFloat(e.target.value))} className="w-full h-1.5 rounded-full appearance-none bg-white/20 accent-white outline-none" />
                        </div>
                     </div>
                   )}

                   {activeTab === 'viz' && (
                     <div className="flex flex-col gap-5">
                        <div className="flex justify-between text-[13px] font-medium text-white/70">
                          <span>Color Palette</span>
                          <span className="capitalize">{visSettings.palette}</span>
                        </div>
                        <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                           {["gold", "cyberpunk", "ocean", "monochrome"].map(palette => (
                              <button key={palette} onClick={() => setVisSettings(p => ({ ...p, palette }))} className={\`flex-1 py-2 text-[12px] tracking-tight font-bold rounded-lg transition-colors \${visSettings.palette === palette ? 'bg-white text-black' : 'text-white/60 hover:text-white'}\`}>{palette}</button>
                           ))}
                        </div>
                        <div className="flex justify-between text-[13px] font-medium text-white/70 mt-2">
                          <span>Visual Effect Type</span>
                          <span className="capitalize">{visSettings.type}</span>
                        </div>
                        <div className="flex bg-white/5 rounded-xl p-1 gap-1 flex-wrap">
                           {["spectrum", "oscilloscope", "circular"].map(type => (
                              <button key={type} onClick={() => setVisSettings(p => ({ ...p, type }))} className={\`flex-1 min-w-[30%] py-2 text-[12px] tracking-tight font-bold rounded-lg transition-colors \${visSettings.type === type ? 'bg-white text-black' : 'text-white/60 hover:text-white'}\`}>{type}</button>
                           ))}
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
console.log("Successfully rewrote UI to iOS style");
