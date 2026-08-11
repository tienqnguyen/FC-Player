const fs = require('fs');
let content = fs.readFileSync('src/components/PixabayStudio.tsx', 'utf8');

content = content.replace(/                                <button onClick=\{\(\) => toggleFavorite\(res\)\} className="p-1.5 bg-black\/40 rounded-full text-pink-400 hover:bg-black\/60">\n                                   <Heart className="w-3.5 h-3.5 fill-current" \/>\n                                <\/button>\n/, '');

content = content.replace(/                             <div className="flex items-center gap-2">\n                                <button onClick=\{\(\) => togglePreview\(res\)\} className="p-1.5 bg-black\/40 rounded-full text-white\/50 hover:text-white hover:bg-black\/60">\n                                   \{playingPreview === res\.id \? <Pause className="w-3.5 h-3.5 text-cyan-400" \/> : <Play className="w-3.5 h-3.5" \/>\}\n                                <\/button>/, `                             <div className="flex items-center gap-2">
                                <button onClick={() => toggleFavorite(res)} className="p-1.5 bg-black/40 rounded-full text-white/50 hover:text-pink-400 hover:bg-black/60">
                                   <Heart className={\`w-3.5 h-3.5 \${favorites.find(f => f.id === res.id) ? 'fill-pink-400 text-pink-400' : ''}\`} />
                                </button>
                                <button onClick={() => togglePreview(res)} className="p-1.5 bg-black/40 rounded-full text-white/50 hover:text-white hover:bg-black/60">
                                   {playingPreview === res.id ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5" />}
                                </button>`);

fs.writeFileSync('src/components/PixabayStudio.tsx', content);
