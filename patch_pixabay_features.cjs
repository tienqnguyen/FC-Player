const fs = require('fs');
let content = fs.readFileSync('src/components/PixabayStudio.tsx', 'utf8');

// 1. Add 'Link' to lucide-react imports
content = content.replace(/import { Search, Play, Pause, Headphones, Download, Trash2, Plus, Sparkles, X, Edit2, Copy, Heart } from 'lucide-react';/, "import { Search, Play, Pause, Headphones, Download, Trash2, Plus, Sparkles, X, Edit2, Copy, Heart, Link } from 'lucide-react';");

// Fix double Play Pause in imports if it exists
content = content.replace(/Play, Pause, Play, Pause,/, 'Play, Pause,');

// 2. Change INSTRUMENTS to just a row of buttons
content = content.replace(/{!showFavorites && \(\n                 <div className="flex items-center gap-2 mb-3">\n                    <select[\s\S]*?<\/select>/, `                 {!showFavorites && (
                 <div className="flex flex-col gap-3 mb-3">
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                       {INSTRUMENTS.map(inst => (
                           <button
                             key={inst}
                             onClick={() => setInstrument(inst)}
                             className={\`px-3 py-1 rounded-full text-[10px] uppercase font-bold whitespace-nowrap transition-colors \${
                               instrument === inst ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                             }\`}
                           >
                             {inst}
                           </button>
                       ))}
                    </div>
                    <div className="flex items-center gap-2">`);

// Close the extra div
content = content.replace(/                       SEARCH\n                    <\/button>\n                 <\/div>\n                 \)}/, `                       SEARCH
                    </button>
                 </div>
                 </div>
                 )}`);

// 3. Fix the missing Heart button in the results list (around line 527)
content = content.replace(/<button onClick=\{\(\) => togglePreview\(res\)\} className="p-1\.5 bg-black\/40 rounded-full text-white\/50 hover:text-white hover:bg-black\/60">\n                                   \{playingPreview === res\.id \? <Pause className="w-3\.5 h-3\.5 text-cyan-400" \/> : <Play className="w-3\.5 h-3\.5" \/>\}\n                                <\/button>/, `<button onClick={() => toggleFavorite(res)} className="p-1.5 bg-black/40 rounded-full text-white/50 hover:text-pink-400 hover:bg-black/60">
                                   <Heart className={\`w-3.5 h-3.5 \${favorites.find(f => f.id === res.id) ? 'fill-pink-400 text-pink-400' : ''}\`} />
                                </button>
                                <button onClick={() => togglePreview(res)} className="p-1.5 bg-black/40 rounded-full text-white/50 hover:text-white hover:bg-black/60">
                                   {playingPreview === res.id ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5" />}
                                </button>`);

// 4. Implement file and url imports in PixabayStudio
const loadFileFunc = `  const handleFileUpload = async (trackId: string, file?: File) => {
    if (!file || !audioCtxRef.current) return;
    try {
        const arrayBuf = await file.arrayBuffer();
        const buffer = await audioCtxRef.current.decodeAudioData(arrayBuf);
        setTracks(prev => prev.map(t => t.id === trackId ? {
            ...t,
            buffer,
            name: file.name,
            duration: buffer.duration,
            fadeOut: Math.min(2, buffer.duration / 2)
        } : t));
    } catch(e) {
        console.error(e);
        alert("Failed to load local audio file.");
    }
  };

  const handleUrlImport = async (trackId: string, url: string) => {
    if (!url || !audioCtxRef.current) return;
    
    // Pixabay link support: if it's a page link, try to extract ID and use Pixabay API
    let fetchUrl = url;
    if (url.includes('pixabay.com/sound-effects/')) {
        const match = url.match(/-(\d+)\/?$/);
        if (match && match[1]) {
            try {
                // If the user pastes a pixabay link, we just search for its ID to get the direct MP3 link
                const res = await fetch(\`/api/pixabay/search?q=\${match[1]}\`);
                const data = await res.json();
                if (data.success && data.data && data.data.length > 0) {
                    fetchUrl = data.data[0].url;
                    // Pre-fill name from pixabay data
                    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, name: data.data[0].name || "Imported Sound" } : t));
                } else {
                    alert("Could not find Pixabay sound by ID.");
                    return;
                }
            } catch(e) {
                console.error(e);
                alert("Failed to resolve Pixabay link.");
                return;
            }
        }
    }

    try {
        const res = await fetch(fetchUrl);
        const arrayBuf = await res.arrayBuffer();
        const buffer = await audioCtxRef.current.decodeAudioData(arrayBuf);
        setTracks(prev => prev.map(t => t.id === trackId ? {
            ...t,
            buffer,
            duration: buffer.duration,
            name: t.name !== "New SFX" ? t.name : (fetchUrl.split('/').pop() || "Imported Link"),
            fadeOut: Math.min(2, buffer.duration / 2)
        } : t));
    } catch(e) {
        console.error(e);
        alert("Failed to load audio from URL. Ensure it's a direct media link (e.g., .mp3) and supports CORS.");
    }
  };
`;

content = content.replace(/  const fetchSFX = async /, loadFileFunc + '\n  const fetchSFX = async ');

// 5. Render buttons instead of just "ADD PIXABAY SOUND"
const addButtonsReplacement = `                 {!track.buffer && activeSearchTrackId !== track.id && (
                     <div className="flex flex-wrap justify-center gap-2 relative z-10 px-4">
                       <button 
                           onClick={() => setActiveSearchTrackId(track.id)}
                           className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-3 py-2 rounded-lg flex items-center gap-1.5"
                       >
                           <Search className="w-3.5 h-3.5" /> PIXABAY
                       </button>
                       <label className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer">
                           <Download className="w-3.5 h-3.5" /> LOCAL FILE
                           <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileUpload(track.id, e.target.files?.[0])} />
                       </label>
                       <button 
                           onClick={() => {
                             const url = prompt("Paste direct Audio URL or Pixabay Link:");
                             if (url) handleUrlImport(track.id, url);
                           }}
                           className="text-[10px] font-bold text-pink-400 hover:text-pink-300 bg-pink-500/10 px-3 py-2 rounded-lg flex items-center gap-1.5"
                       >
                           <Link className="w-3.5 h-3.5" /> IMPORT LINK
                       </button>
                     </div>
                 )}`;

content = content.replace(/                 \{\!track\.buffer && activeSearchTrackId !== track\.id && \(\n                     <button\n                         onClick=\{\(\) => setActiveSearchTrackId\(track\.id\)\}\n                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500\/10 px-4 py-2 rounded-lg flex items-center gap-2"\n                     >\n                         <Search className="w-4 h-4" \/> ADD PIXABAY SOUND\n                     <\/button>\n                 \)\}/, addButtonsReplacement);

fs.writeFileSync('src/components/PixabayStudio.tsx', content);
