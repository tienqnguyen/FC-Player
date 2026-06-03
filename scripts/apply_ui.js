import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Change full screen background style
const bgOld = `           {currentSong?.cover && (
              <img src={currentSong.cover} className="absolute inset-0 w-full h-full object-cover blur-[60px] opacity-30 scale-125 saturate-150 transform-gpu will-change-transform" alt="bg" />
           )}`;
const bgNew = `           {currentSong?.cover && (
              <img src={currentSong.cover} className="absolute inset-0 w-full h-full object-cover opacity-50 saturate-150 transform-gpu will-change-transform" alt="bg" />
           )}`;
content = content.replace(bgOld, bgNew);

// 2. Remove Central Album Artwork
const artworkOld = `              {/* Central Album Artwork */}
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
              </div>`;
const artworkNew = `              {/* Central Artwork Removed as per user request - Fill Space Instead */}
              <div className="flex-1" />`;
content = content.replace(artworkOld, artworkNew);

// 3. HD Sound toggle near controller
const hintOld = `              {/* Central Swipe Hint & HD Status */}
              <div className="flex flex-col items-center justify-center shrink-0 relative z-30 mb-8 cursor-pointer group" onClick={() => setShowTuning(true)}>
                 <div className="flex items-center gap-2 px-5 py-2.5 rounded-[20px] bg-[#12141D]/80 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-white/10 group-hover:border-[#0A84FF]/50 transition-all">
                   <div className={\`p-1.5 rounded-full \${isSignatureSound ? 'bg-[#0A84FF]/20 text-[#0A84FF]' : 'bg-white/5 text-gray-400'}\`}>
                     <Zap className={\`w-4 h-4 \${isSignatureSound ? 'fill-[#0A84FF]' : ''}\`} /> 
                   </div>
                   <div className="flex flex-col items-start pr-1">
                     <span className="uppercase tracking-widest text-[10px] font-black text-white/50 leading-tight">Swipe Up For</span>
                     <span className={\`uppercase tracking-widest text-[12px] font-black leading-tight \${isSignatureSound ? 'text-white' : 'text-gray-400'}\`}>HD SOUND</span>
                   </div>
                 </div>
              </div>`;

const hintNew = `              {/* HD Sound Toggle Near Controller */}
              <div className="flex justify-center shrink-0 relative z-30 mb-6">
                <button
                  onClick={() => setIsSignatureSound(!isSignatureSound)}
                  className={\`flex items-center gap-2 px-5 py-2.5 rounded-full backdrop-blur-lg border transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 \${isSignatureSound ? 'bg-[#0A84FF]/20 border-[#0A84FF]/50 text-white' : 'bg-white/10 border-white/20 text-white/80'}\`}
                >
                  <Zap className={\`w-4 h-4 \${isSignatureSound ? 'fill-[#0A84FF] text-[#0A84FF]' : 'text-white/80'}\`} />
                  <span className="uppercase tracking-widest text-[11px] font-black">{isSignatureSound ? 'HD AUDIO ON' : 'HD AUDIO OFF'}</span>
                </button>
              </div>`;

content = content.replace(hintOld, hintNew);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Updated App.tsx");
