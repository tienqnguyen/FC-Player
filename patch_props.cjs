const fs = require('fs');
let content = fs.readFileSync('src/components/PixabayStudio.tsx', 'utf8');

const newProps = `                 <div className="flex-1 grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[10px] font-bold text-white/50 uppercase">Start Time (s)</label>
                       <input 
                           type="number" min="0" step="0.1" 
                           value={track.startTime.toFixed(2)} 
                           onChange={e => setTracks(p => p.map(t => t.id === track.id ? {...t, startTime: Number(e.target.value)} : t))}
                           className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" 
                       />
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[10px] font-bold text-white/50 uppercase">Trim Left (s)</label>
                       <input 
                           type="number" min="0" step="0.1" max={(track.duration || 0) - (track.trimEnd || 0)}
                           value={(track.trimStart || 0).toFixed(2)} 
                           onChange={e => setTracks(p => p.map(t => t.id === track.id ? {...t, trimStart: Number(e.target.value)} : t))}
                           className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" 
                       />
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[10px] font-bold text-white/50 uppercase">Trim Right (s)</label>
                       <input 
                           type="number" min="0" step="0.1" max={(track.duration || 0) - (track.trimStart || 0)}
                           value={(track.trimEnd || 0).toFixed(2)} 
                           onChange={e => setTracks(p => p.map(t => t.id === track.id ? {...t, trimEnd: Number(e.target.value)} : t))}
                           className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" 
                       />
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[10px] font-bold text-white/50 uppercase">Fade In (s)</label>
                       <input 
                           type="number" min="0" step="0.1" 
                           value={track.fadeIn} 
                           onChange={e => setTracks(p => p.map(t => t.id === track.id ? {...t, fadeIn: Number(e.target.value)} : t))}
                           className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" 
                       />
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[10px] font-bold text-white/50 uppercase">Fade Out (s)</label>
                       <input 
                           type="number" min="0" step="0.1" 
                           value={track.fadeOut} 
                           onChange={e => setTracks(p => p.map(t => t.id === track.id ? {...t, fadeOut: Number(e.target.value)} : t))}
                           className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" 
                       />
                    </div>
                 </div>`;

content = content.replace(/                 <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">[\s\S]*?                 <\/div>\n                 <div className="flex items-end gap-2">/, newProps + '\n                 <div className="flex items-end gap-2">');

fs.writeFileSync('src/components/PixabayStudio.tsx', content);
