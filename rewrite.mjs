import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// replace imports
content = content.replace(/import \{[\s\S]*?\} from "lucide-react";/, `import {
  Upload, Play, Pause, VolumeX, SlidersHorizontal, Power, Info, Speaker, Wand2, AudioWaveform, AudioLines, Waves, Maximize2, Zap, Mic2, Download, Sparkles, Film, Wind, Headset, Disc3, Radio, Coffee, Crosshair, Podcast, Guitar, Dumbbell, Clock, Cpu, Trash2, History, Music, ChevronDown, Home, Library, Search, Heart, SkipBack, SkipForward, MoreHorizontal
} from "lucide-react";`);

// add isExpanded state
content = content.replace("  const handleExport = async () => {", "  const [isExpanded, setIsExpanded] = useState(false);\n\n  const handleExport = async () => {");

// replace return block
const splitToken = '  return (\n    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#c7a17a] selection:text-black flex flex-col relative overflow-hidden">';
const splitIndex = content.lastIndexOf(splitToken);

if (splitIndex !== -1) {
  const newReturn = `  return (
    <div className="min-h-[100dvh] bg-[#121212] text-white font-sans flex flex-col relative overflow-hidden">
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
        <header className="px-6 pt-10 pb-6 bg-gradient-to-b from-[#2a2a2a] to-[#121212] sticky top-0 z-20">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Good evening</h1>
            <div className="flex gap-4">
              <History className="w-6 h-6 text-[#b3b3b3]" />
              <div className="w-8 h-8 rounded-full bg-[#535353] flex items-center justify-center text-sm font-semibold">U</div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-[#b3b3b3]" />
            </div>
            <form onSubmit={handleTiktokFetch}>
              <input
                type="text"
                placeholder="Search or paste TikTok link..."
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                className="w-full bg-[#242424] hover:bg-[#2a2a2a] border border-transparent rounded-full py-3 pl-10 pr-4 text-sm text-white placeholder:text-[#b3b3b3] focus:outline-none focus:border-white focus:bg-[#333] transition-colors shadow-lg"
                disabled={isFetchingTiktok}
              />
              <button type="submit" className="hidden">Submit</button>
            </form>
          </div>
          
          {isFetchingTiktok && (
             <p className="text-[#1ED760] text-xs mt-3 flex items-center gap-2">
               <div className="w-3 h-3 border-2 border-[#1ED760]/30 border-t-[#1ED760] rounded-full animate-spin" />
               Searching TikTok audio...
             </p>
          )}
          {tiktokError && (
             <p className="text-red-400 text-xs mt-3">{tiktokError}</p>
          )}
        </header>

        <main className="px-6 py-4 space-y-8">
          <section>
            <div className="grid grid-cols-2 gap-3">
              <label className="bg-[#2a2a2a]/60 hover:bg-[#3a3a3a] transition-colors rounded p-3 flex items-center gap-3 cursor-pointer group shadow">
                 <div className="w-10 h-10 bg-gradient-to-br from-[#1ED760] to-[#179c45] rounded flex items-center justify-center text-black shadow-md transition-transform group-hover:scale-105">
                   <Upload className="w-5 h-5" />
                 </div>
                 <span className="font-semibold text-sm">Upload File</span>
                 <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </section>

          {recentSongs.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Your Recent Imports</h2>
              <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar">
                {recentSongs.map(song => (
                   <div key={song.id} 
                        onClick={() => playRecentSong(song)}
                        className="bg-[#181818] hover:bg-[#282828] transition-colors p-4 rounded-md min-w-[140px] max-w-[140px] cursor-pointer group flex-shrink-0">
                      <div className="w-full aspect-square bg-[#282828] rounded-md mb-4 flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.5)] relative">
                         <Music className="w-10 h-10 text-[#b3b3b3] group-hover:text-white transition-colors" />
                         <div className="absolute bottom-2 right-2 w-10 h-10 bg-[#1ED760] rounded-full flex items-center justify-center shadow-lg transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all hover:scale-105 hover:bg-[#2ced70]">
                           <Play className="w-5 h-5 text-black fill-black ml-1" />
                         </div>
                      </div>
                      <p className="font-semibold text-sm text-white truncate">{song.title}</p>
                      <p className="text-[#b3b3b3] text-xs truncate mt-1">TikTok Audio</p>
                   </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-bold mb-4">History</h2>
            <div className="flex flex-col gap-2">
               {recentSongs.slice(0, 10).map(song => (
                  <div key={song.id} 
                       onClick={() => playRecentSong(song)}
                       className="flex items-center gap-3 p-2 rounded-md hover:bg-[#2a2a2a] cursor-pointer group transition-colors">
                     <div className="w-12 h-12 bg-[#282828] rounded flex-shrink-0 flex items-center justify-center relative">
                        <Music className="w-5 h-5 text-[#b3b3b3]" />
                        <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded">
                           <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate group-hover:text-[#1ED760]">{song.title}</p>
                        <p className="text-[#b3b3b3] text-xs truncate">{song.originalUrl}</p>
                     </div>
                     <div className="opacity-0 group-hover:opacity-100 px-2 transition-opacity">
                        <button onClick={(e) => deleteRecentSong(song.id, e)} className="text-[#b3b3b3] hover:text-white">
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
               ))}
               {recentSongs.length === 0 && (
                 <div className="text-[#b3b3b3] text-sm py-4">No recent tracks. Paste a link to get started!</div>
               )}
            </div>
          </section>
          
          <div className="h-20"></div>
        </main>
      </div>

      {/* --- Global Bottom Mini-Player OR Expanded Player --- */}
      <div 
        className={\`fixed bottom-0 left-0 right-0 z-50 bg-[#121212] transition-transform duration-500 ease-in-out flex flex-col \${
           isExpanded ? "h-[100dvh] translate-y-0" : "h-auto translate-y-0 border-t border-[#282828]"
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
          /* MINIPLAYER (only visible when not expanded) */
          <div className="flex flex-col">
            <div className="relative px-2 pb-2 pt-2 bg-[#121212]">
              {audioUrl && (
                <div 
                  onClick={() => setIsExpanded(true)}
                  className="bg-[#242424] md:mx-auto md:max-w-screen-md mx-2 hover:bg-[#2a2a2a] rounded flex items-center justify-between p-2 cursor-pointer shadow-lg mb-2 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <div className="w-12 h-12 bg-[#333] rounded shadow overflow-hidden flex items-center justify-center flex-shrink-0 group relative">
                       {/* Subtle visualizer preview background */}
                       <div className="absolute inset-0 opacity-20"><Visualizer analyser={analyser} isPlaying={isPlaying} settings={visSettings} /></div>
                       <Music className="w-5 h-5 text-[#b3b3b3] z-10" />
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                       <div className="flex items-center gap-2">
                         <span className="text-sm font-semibold truncate text-white">{fileName || "Unknown Track"}</span>
                       </div>
                       <div className="text-xs text-[#b3b3b3] truncate">{isSignatureSound ? "HD Enhanced" : "Original"} • {formatDurationDisplay(duration)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 pr-2">
                     <button onClick={(e) => { e.stopPropagation(); }} className="text-[#1ED760] p-2">
                        <Heart className="w-5 h-5 fill-[#1ED760]" />
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        className="text-white p-2 hover:scale-110 transition-transform"
                     >
                        {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-1" />}
                     </button>
                  </div>
                  
                  <div className="absolute bottom-2 left-4 right-4 h-0.5 bg-white/10 rounded-full overflow-hidden pointer-events-none md:max-w-screen-md md:mx-auto mx-2">
                     <div className="h-full bg-white transition-all duration-100" style={{ width: \`\${progress}%\` }} />
                  </div>
                </div>
              )}
              
              {/* Bottom Nav */}
              <div className="flex justify-around items-center pt-2 pb-6 px-4 md:max-w-screen-md md:mx-auto">
                 <button className="flex flex-col items-center gap-1 text-white">
                    <Home className="w-6 h-6" />
                    <span className="text-[10px] font-medium mt-1">Home</span>
                 </button>
                 <button className="flex flex-col items-center gap-1 text-[#b3b3b3] hover:text-white transition-colors">
                    <Search className="w-6 h-6" />
                    <span className="text-[10px] font-medium mt-1">Search</span>
                 </button>
                 <button className="flex flex-col items-center gap-1 text-[#b3b3b3] hover:text-white transition-colors cursor-not-allowed">
                    <Library className="w-6 h-6" />
                    <span className="text-[10px] font-medium mt-1">Your Library</span>
                 </button>
                 <button onClick={() => { if(audioUrl) { setIsExpanded(true); setTimeout(() => setShowTuning(true), 300); } }} className="flex flex-col items-center gap-1 text-[#b3b3b3] hover:text-white">
                    <Sparkles className="w-6 h-6" />
                    <span className="text-[10px] font-medium mt-1">HD Tuning</span>
                 </button>
              </div>
            </div>
          </div>
        )}

        {isExpanded && (
          /* EXPANDED PLAYER */
          <div className="h-full w-full bg-gradient-to-t from-[#121212] via-[#2a2a2a] to-[#404040] flex flex-col px-6 py-4 overflow-y-auto custom-scrollbar relative">
             
             {/* Header */}
             <div className="relative z-10 flex justify-between items-center mt-6 mb-8 shrink-0">
                <button onClick={() => setIsExpanded(false)} className="text-white p-2 -ml-2">
                   <ChevronDown className="w-7 h-7" />
                </button>
                <div className="text-xs font-semibold text-white tracking-widest text-center">
                   NOW PLAYING
                   <div className="text-[#b3b3b3] text-[10px] mt-1 tracking-normal">{isSignatureSound ? 'Acoustic Presence Engine' : 'Raw Import'}</div>
                </div>
                <button className="text-white p-2 -mr-2">
                   <MoreHorizontal className="w-7 h-7" />
                </button>
             </div>

             {/* Artwork */}
             <div className="relative z-10 mb-8 w-full flex-1 min-h-[220px] flex items-center justify-center">
                <div className="w-full max-w-[340px] aspect-square bg-[#282828] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center p-6 relative overflow-hidden group">
                   <div className="absolute inset-0 opacity-30 pointer-events-none">
                      <Visualizer analyser={analyser} isPlaying={isPlaying} settings={visSettings} />
                   </div>
                   <Music className="w-24 h-24 text-[#333] z-10" />
                   
                   {/* Overlay Switcher */}
                   <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
                      <div className="bg-black/50 backdrop-blur-xl rounded-full p-1 flex items-center border border-white/10 shadow-lg">
                         <button 
                           onClick={() => { resumeContext(); toggleSignatureSound(false); }}
                           className={\`px-5 py-2 text-[11px] font-bold rounded-full transition-all \${!isSignatureSound ? 'bg-white text-black scale-105 shadow-md' : 'text-[#b3b3b3] hover:text-white'}\`}
                         >Source</button>
                         <button 
                           onClick={() => { resumeContext(); toggleSignatureSound(true); }}
                           className={\`px-5 py-2 text-[11px] font-bold rounded-full flex gap-1.5 items-center transition-all \${isSignatureSound ? 'bg-[#1ED760] text-black scale-105 shadow-[0_0_15px_rgba(30,215,96,0.3)]' : 'text-[#b3b3b3] hover:text-white'}\`}
                         ><Sparkles className="w-3.5 h-3.5" />Enhanced HD</button>
                      </div>
                   </div>
                </div>
             </div>

             {/* Track Info */}
             <div className="relative z-10 mb-6 flex justify-between items-end shrink-0">
                <div className="flex-1 min-w-0 pr-4">
                   <h2 className="text-2xl font-bold text-white truncate mb-1">{fileName || "Unknown Track"}</h2>
                   <p className="text-[#b3b3b3] text-base truncate">Custom Audio Import</p>
                </div>
                <button className="text-[#1ED760]">
                   <Heart className="w-7 h-7 fill-[#1ED760]" />
                </button>
             </div>

             {/* Progress / Seek */}
             <div className="relative z-10 mb-6 shrink-0">
                <div 
                  className="w-full h-1 bg-white/30 rounded-full cursor-pointer flex items-center relative group py-2 -my-2"
                  onClick={(e) => {
                    if (audioRef.current && !isNaN(audioRef.current.duration)) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos = (e.clientX - rect.left) / rect.width;
                      audioRef.current.currentTime = pos * audioRef.current.duration;
                    }
                  }}
                >
                   <div className="absolute left-0 top-[calc(50%-2px)] h-1 bg-white group-hover:bg-[#1ED760] transition-colors rounded-full pointer-events-none" style={{ width: \`\${progress}%\` }}>
                     <div className="w-3 h-3 bg-white rounded-full absolute -right-1.5 opacity-0 group-hover:opacity-100 shadow transform translate-y-[-2px]"></div>
                   </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-[#b3b3b3] font-medium">
                   <span>{audioRef.current ? formatDurationDisplay(audioRef.current.currentTime) : "0:00"}</span>
                   <span>{formatDurationDisplay(duration)}</span>
                </div>
             </div>

             {/* Playback Controls */}
             <div className="relative z-10 flex justify-between items-center mb-8 shrink-0 px-2 lg:px-8">
                <button 
                  className={\`hover:text-white transition-colors \${showTuning ? 'text-[#1ED760]' : 'text-[#b3b3b3]'}\`} 
                  onClick={() => setShowTuning(!showTuning)}
                >
                   <SlidersHorizontal className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-6 md:gap-10">
                   <button onClick={() => { if(audioRef.current) audioRef.current.currentTime = 0; }} className="text-white hover:opacity-70 transition-opacity">
                      <SkipBack className="w-9 h-9 fill-white" />
                   </button>
                   <button 
                     onClick={togglePlay}
                     className="w-[72px] h-[72px] bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                   >
                     {isPlaying ? <Pause className="w-8 h-8 fill-black" /> : <Play className="w-8 h-8 fill-black ml-1" />}
                   </button>
                   <button className="text-white hover:opacity-70 transition-opacity cursor-not-allowed">
                      <SkipForward className="w-9 h-9 fill-white" />
                   </button>
                </div>
                <button onClick={handleExport} className={\`hover:text-white transition-colors \${isExporting ? 'animate-pulse text-[#1ED760]' : 'text-[#b3b3b3]'}\`}>
                   <Download className="w-6 h-6" />
                </button>
             </div>

             {/* Tuning Panel inline (no modal) */}
             {showTuning && (
                <div className="relative z-10 bg-[#282828] rounded-xl p-4 mb-4 shadow-lg border border-white/5 shrink-0">
                   <div className="flex justify-between items-center mb-4">
                     <span className="text-xs font-bold tracking-widest text-[#1ED760]"><Zap className="inline w-3 h-3 mr-1 mb-0.5" /> STUDIO DSP</span>
                   </div>
                   <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2">
                     <button onClick={() => setActiveTab("presets")} className={\`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors \${activeTab === 'presets' ? 'bg-[#1ED760] text-black' : 'bg-[#333] text-white hover:bg-[#3a3a3a]'}\`}>Presets</button>
                     <button onClick={() => setActiveTab("eq")} className={\`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors \${activeTab === 'eq' ? 'bg-[#1ED760] text-black' : 'bg-[#333] text-white hover:bg-[#3a3a3a]'}\`}>EQ</button>
                     <button onClick={() => setActiveTab("spatial")} className={\`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors \${activeTab === 'spatial' ? 'bg-[#1ED760] text-black' : 'bg-[#333] text-white hover:bg-[#3a3a3a]'}\`}>Spatial</button>
                     <button onClick={() => setActiveTab("viz")} className={\`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors \${activeTab === 'viz' ? 'bg-[#1ED760] text-black' : 'bg-[#333] text-white hover:bg-[#3a3a3a]'}\`}>Visualizer</button>
                   </div>
                   
                   {activeTab === 'presets' && (
                      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                         {PRESETS.map((p) => (
                           <div key={p.id} onClick={() => applyPreset(p)} className={\`flex-shrink-0 w-[120px] p-3 rounded-md cursor-pointer transition-colors \${activePresetId === p.id ? 'bg-[#1ED760]/20 border border-[#1ED760]' : 'bg-[#333] hover:bg-[#3a3a3a] border border-transparent'}\`}>
                             <p className={\`text-sm font-bold truncate \${activePresetId === p.id ? 'text-[#1ED760]' : 'text-white'}\`}>{p.name}</p>
                             <p className="text-[10px] text-[#b3b3b3] mt-1 line-clamp-2">{p.desc}</p>
                           </div>
                         ))}
                      </div>
                   )}

                   {activeTab === 'eq' && (
                      <div className="flex flex-col gap-4">
                         <div className="flex gap-1 justify-between mb-2">
                           {eqSettings.map((band, i) => (
                              <button key={i} onClick={() => setActiveBand(i)} className={\`flex-1 py-1 px-1 text-[10px] rounded text-center font-mono transition-colors \${activeBand === i ? 'bg-[#1ED760] text-black font-semibold' : 'bg-[#333] text-white/50 hover:bg-[#3a3a3a]'}\`}>
                                {band.name}
                              </button>
                           ))}
                         </div>
                         <div className="flex justify-between text-xs text-[#b3b3b3]">
                           <span>Gain: {eqSettings[activeBand].g > 0 ? "+" : ""}{eqSettings[activeBand].g.toFixed(1)} dB</span>
                           <span>{eqSettings[activeBand].name} ({eqSettings[activeBand].f}Hz)</span>
                         </div>
                         <input type="range" min="-12" max="12" step="0.1" value={eqSettings[activeBand].g} onChange={(e) => handleEqChange(activeBand, "g", parseFloat(e.target.value))} className="w-full accent-[#1ED760] bg-[#1a1a1a] h-1.5 rounded-full" />
                      </div>
                   )}
                   
                   {activeTab === 'spatial' && (
                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[#b3b3b3] uppercase tracking-wider font-semibold">Sub-Bass</span>
                          <input type="range" min="0" max="1" step="0.05" value={spatialSettings.bassWeight} onChange={(e) => handleSpatialChange("bassWeight", parseFloat(e.target.value))} className="w-full accent-[#1ED760] bg-[#1a1a1a] h-1.5 rounded-full" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[#b3b3b3] uppercase tracking-wider font-semibold">Sparkle</span>
                          <input type="range" min="0" max="0.3" step="0.01" value={spatialSettings.clarity} onChange={(e) => handleSpatialChange("clarity", parseFloat(e.target.value))} className="w-full accent-[#1ED760] bg-[#1a1a1a] h-1.5 rounded-full" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[#b3b3b3] uppercase tracking-wider font-semibold">Width</span>
                          <input type="range" min="1.0" max="3.0" step="0.05" value={spatialSettings.wideness} onChange={(e) => handleSpatialChange("wideness", parseFloat(e.target.value))} className="w-full accent-[#1ED760] bg-[#1a1a1a] h-1.5 rounded-full" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-[#b3b3b3] uppercase tracking-wider font-semibold">Aborb Room</span>
                          <input type="range" min="0" max="0.5" step="0.01" value={spatialSettings.reverb} onChange={(e) => handleSpatialChange("reverb", parseFloat(e.target.value))} className="w-full accent-[#1ED760] bg-[#1a1a1a] h-1.5 rounded-full" />
                        </div>
                     </div>
                   )}

                   {activeTab === 'viz' && (
                     <div className="flex flex-col gap-4">
                        <div className="flex justify-between text-xs text-[#b3b3b3]">
                          <span>Color Palette</span>
                          <span className="capitalize">{visSettings.palette}</span>
                        </div>
                        <div className="flex bg-[#1a1a1a] rounded p-1 gap-1">
                           {["gold", "cyberpunk", "ocean", "monochrome"].map(palette => (
                              <button key={palette} onClick={() => setVisSettings(p => ({ ...p, palette }))} className={\`flex-1 py-1.5 text-[10px] uppercase font-bold rounded \${visSettings.palette === palette ? 'bg-[#1ED760] text-black' : 'text-[#b3b3b3] hover:text-white'}\`}>{palette}</button>
                           ))}
                        </div>
                        <div className="flex justify-between text-xs text-[#b3b3b3] mt-2">
                          <span>Visual Effect type</span>
                          <span className="capitalize">{visSettings.type}</span>
                        </div>
                        <div className="flex bg-[#1a1a1a] rounded p-1 gap-1 flex-wrap">
                           {["spectrum", "oscilloscope", "circular"].map(type => (
                              <button key={type} onClick={() => setVisSettings(p => ({ ...p, type }))} className={\`flex-1 min-w-[70px] py-1.5 text-[10px] uppercase font-bold rounded \${visSettings.type === type ? 'bg-[#1ED760] text-black' : 'text-[#b3b3b3] hover:text-white'}\`}>{type}</button>
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
  content = content.substring(0, splitIndex) + newReturn;
  fs.writeFileSync('src/App.tsx', content, 'utf-8');
  console.log("Rewrite successful!");
} else {
  console.error("Split point not found...");
}
