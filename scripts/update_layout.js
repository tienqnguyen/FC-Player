import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Move visualizer from background (line 1568-1571) to central flexible area
// We find:
//           {/* Visualizer container that stretches appropriately */}
//           <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 aspect-square flex items-center justify-center opacity-70  scale-[1.15] transform-gpu">
//              <Visualizer analyser={analyser} isPlaying={isPlaying} settings={{...visSettings, type: 'circular', palette: 'ocean', glowStrength: 20}} className="w-full h-full max-w-[800px] max-h-[800px]" />
//           </div>
const bgVizRegex = /\{\/\* Visualizer container that stretches appropriately \*\/\}\s*<div className="absolute inset-x-0[^>]*>\s*<Visualizer[^>]*\/>\s*<\/div>/g;
content = content.replace(bgVizRegex, ''); // Remove the background map completely

// Find Central Artwork Removed and replace with Visualizer
const centralArt = `              {/* Central Artwork Removed as per user request - Fill Space Instead */}
              <div className="flex-1" />`;
const centralViz = `              {/* Central Artwork Removed as per user request - Fill Space Instead */}
              <div className="flex-1 min-h-0 flex items-center justify-center relative w-full mb-6 mt-2 relative z-30">
                 <Visualizer analyser={analyser} isPlaying={isPlaying} settings={{...visSettings, type: 'circular', palette: 'ocean', glowStrength: 20}} className="w-full h-full max-w-[400px] max-h-[400px] opacity-90" />
              </div>`;
content = content.replace(centralArt, centralViz);


// 2. Remove old HD button
const oldHDBtnRegex = /\{\/\* HD Sound Toggle Near Controller \*\/\}\s*<div className="flex justify-center shrink-0 relative z-30 mb-6">\s*<button[^>]*>\s*<Zap[^>]*\/>\s*<span[^>]*>[^<]*<\/span>\s*<\/button>\s*<\/div>/;
content = content.replace(oldHDBtnRegex, '');

// 3. Put HD button in primary controls row
const primaryControlsOld = `<button className="text-white/40 hover:text-white transition-colors p-2">
                      <Shuffle className="w-7 h-7" />
                  </button>`;
const primaryControlsNew = `<button onClick={() => { resumeContext(); toggleSignatureSound(!isSignatureSound); }} className={\`flex flex-col items-center justify-center p-2 transition-all \${isSignatureSound ? 'text-[#0A84FF]' : 'text-white/40 hover:text-white'}\`}>
                      <Zap className={\`w-6 h-6 \${isSignatureSound ? 'fill-[#0A84FF]' : ''}\`} />
                      <span className="text-[9px] font-black uppercase tracking-wider mt-1">HD</span>
                  </button>`;
content = content.replace(primaryControlsOld, primaryControlsNew);


// 4. Smaller Bottom Nav Player
const bottomNavOld = `<div className="flex items-center justify-around px-4 pt-3 pb-6 bg-[#0A0B10]/95 backdrop-blur-sm border-t border-white/5 isolate">
                <button className="flex flex-col items-center text-white opacity-40 hover:opacity-100 transition-opacity p-2">
                    <Home className="w-6 h-6" />
                </button>
                <div className="relative p-2">
                    <button className="flex flex-col items-center text-white shadow-md bg-white/10 p-2 rounded-xl">
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
            </div>`;

const bottomNavNew = `<div className="flex items-center justify-around px-2 py-2 pb-safe bg-[#0A0B10]/95 backdrop-blur-sm border-t border-white/5 isolate shadow-[0_-10px_20px_rgba(0,0,0,0.4)]">
                <button className="flex flex-col items-center text-white opacity-40 hover:opacity-100 transition-opacity p-1.5">
                    <Home className="w-5 h-5" />
                </button>
                <div className="relative p-1">
                    <button className="flex flex-col items-center text-white shadow-md bg-white/10 p-1.5 rounded-xl">
                        <Library className="w-5 h-5" />
                    </button>
                </div>
                <button className="flex flex-col items-center text-white opacity-40 hover:opacity-100 transition-opacity p-1.5">
                    <Heart className="w-5 h-5" />
                </button>
                <button className="flex flex-col items-center text-[9px] text-white opacity-40 hover:opacity-100 transition-opacity p-1.5 font-bold tracking-widest uppercase gap-1">
                    <div className="w-5 h-5 rounded-full border-2 border-white/50 bg-[#1A1D27] flex items-center justify-center"><User className="w-2.5 h-2.5 text-white" /></div>
                    User
                </button>
            </div>`;
content = content.replace(bottomNavOld, bottomNavNew);

// 5. Smaller Miniplayer
const miniplayerOld = `bg-[#12141D]/90 hover:bg-[#181B26]/90 md:mx-auto md:max-w-screen-md mx-auto w-full rounded-[24px] flex items-center justify-between p-2 cursor-pointer shadow-md mb-2 transition-all backdrop-blur-sm border border-white/10`;
const miniplayerNew = `bg-[#12141D]/90 hover:bg-[#181B26]/90 md:mx-auto md:max-w-screen-md mx-auto w-full rounded-[16px] flex items-center justify-between p-1.5 cursor-pointer shadow-md mb-1 transition-all backdrop-blur-sm border border-white/10`;
content = content.replace(miniplayerOld, miniplayerNew);

const miniImageOld = `<div className="w-[48px] h-[48px] bg-[#1A1D27] rounded-[18px] overflow-hidden flex items-center justify-center flex-shrink-0 relative border border-white/5">`;
const miniImageNew = `<div className="w-[36px] h-[36px] bg-[#1A1D27] rounded-[10px] overflow-hidden flex items-center justify-center flex-shrink-0 relative border border-white/5">`;
content = content.replace(miniImageOld, miniImageNew);


fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Updated App.tsx layouts");
