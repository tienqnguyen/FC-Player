const fs = require('fs');
let content = fs.readFileSync('src/components/PixabayStudio.tsx', 'utf8');

// Update lucide-react imports to add Heart
content = content.replace(/import { Search, Volume2, VolumeX, Play, Pause, Headphones, Download, Trash2, Plus, Sparkles, X, Edit2, Copy } from 'lucide-react';/, "import { Search, Volume2, VolumeX, Play, Pause, Headphones, Download, Trash2, Plus, Sparkles, X, Edit2, Copy, Heart } from 'lucide-react';");

// Update CATEGORIES and add INSTRUMENTS
content = content.replace(/const CATEGORIES = \["Impact", "Whoosh", "Nature", "Cinematic", "Footsteps", "Horror", "Animals", "UI", "Sci-Fi", "Weather"\];/, `const CATEGORIES = ["atmosphere", "cinematic", "background", "atmospheric pads", "ambient pads", "dreamy pads", "synth pads", "chill pads", "space pads", "3d surround", "intro"];
const INSTRUMENTS = ["Any Instrument", "Piano", "Guitar", "Bass", "Drums", "Strings", "Synth", "Brass", "Woodwinds", "Percussion", "Vocals", "Pad"];`);

// Add states for instrument, favorites, and showFavorites
content = content.replace(/  const \[category, setCategory\] = useState\("Nature"\);/, `  const [category, setCategory] = useState("atmosphere");
  const [instrument, setInstrument] = useState("Any Instrument");
  const [favorites, setFavorites] = useState<SFXResult[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  
  useEffect(() => {
    const saved = localStorage.getItem('pixabayFavorites');
    if (saved) {
      try { setFavorites(JSON.parse(saved)); } catch(e){}
    }
  }, []);
  
  const toggleFavorite = (res: SFXResult) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.id === res.id);
      let next;
      if (exists) next = prev.filter(f => f.id !== res.id);
      else next = [...prev, res];
      localStorage.setItem('pixabayFavorites', JSON.stringify(next));
      return next;
    });
  };
`);

// Ensure activeSearchTrackId resets showFavorites
content = content.replace(/const addTrack = \(\) => {/g, `const addTrack = () => {
    setShowFavorites(false);`);

// Update the search fetching to include instrument if not "Any Instrument"
content = content.replace(/const res = await fetch\(\`\/api\/pixabay\/search\?q=\$\{encodeURIComponent\(searchQuery\)\}\`\);/, `let fullQuery = searchQuery;
      if (instrument !== "Any Instrument") fullQuery += " " + instrument;
      const res = await fetch(\`/api/pixabay/search?q=\${encodeURIComponent(fullQuery)}\`);`);

// Make sure category changes also re-fetch with instrument (handled via useEffect)
content = content.replace(/  }, \[category, activeSearchTrackId\]\);/, `  }, [category, instrument, activeSearchTrackId]);`);

// Add favorites toggle to UI and instruments dropdown
const searchHeaderReplacement = `                 <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mb-2">
                    <button
                        onClick={() => setShowFavorites(!showFavorites)}
                        className={\`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 \${
                          showFavorites ? 'bg-pink-500 text-white' : 'bg-white/5 text-pink-400 hover:bg-white/10'
                        }\`}
                    >
                        <Heart className={\`w-3.5 h-3.5 \${showFavorites ? 'fill-current' : ''}\`} />
                        Favorites (\${favorites.length})
                    </button>
                    <div className="w-px h-6 bg-white/10 shrink-0 self-center mx-1"></div>
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => { setCategory(cat); setShowFavorites(false); }}
                        className={\`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors \${
                          !showFavorites && category === cat ? 'bg-cyan-500 text-black font-bold' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }\`}
                      >
                        {cat}
                      </button>
                    ))}
                 </div>
                 
                 {!showFavorites && (
                 <div className="flex items-center gap-2 mb-3">
                    <select
                        value={instrument}
                        onChange={e => setInstrument(e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-white max-w-[140px] focus:outline-none focus:border-cyan-500/50"
                    >
                        {INSTRUMENTS.map(inst => (
                            <option key={inst} value={inst}>{inst}</option>
                        ))}
                    </select>
                    <input
                       type="text"
                       placeholder="Search Pixabay..."
                       value={query}
                       onChange={e => setQuery(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && fetchSFX(query)}
                       className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    />
                    <button onClick={() => fetchSFX(query)} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs px-4 py-2 rounded-lg">
                       SEARCH
                    </button>
                 </div>
                 )}`;

content = content.replace(/                 <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mb-2">[\s\S]*?SEARCH\n                    <\/button>\n                 <\/div>/, searchHeaderReplacement);

// Render favorites if showFavorites is true
content = content.replace(/                 \{loading \? \(/, `                 {showFavorites ? (
                    <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                       {favorites.map((res, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors">
                             <span className="text-xs text-white/70 truncate flex-1">{res.name}</span>
                             <div className="flex items-center gap-2">
                                <button onClick={() => toggleFavorite(res)} className="p-1.5 bg-black/40 rounded-full text-pink-400 hover:bg-black/60">
                                   <Heart className="w-3.5 h-3.5 fill-current" />
                                </button>
                                <button onClick={() => togglePreview(res)} className="p-1.5 bg-black/40 rounded-full text-white/50 hover:text-white hover:bg-black/60">
                                   {playingPreview === res.id ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => loadSound(track.id, res)} className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors">
                                   ADD TO TRACK
                                </button>
                             </div>
                          </div>
                       ))}
                       {favorites.length === 0 && <div className="text-center p-4 text-xs text-white/30">No favorites yet</div>}
                    </div>
                 ) : loading ? (`);

// In the standard search results rendering, update icons and add Heart
content = content.replace(/<button onClick=\{\(\) => togglePreview\(res\)\} className="p\.1\.5 bg-black\/40 rounded-full text-white\/50 hover:text-white hover:bg-black\/60">/g, `<button onClick={() => toggleFavorite(res)} className="p-1.5 bg-black/40 rounded-full text-white/50 hover:text-pink-400 hover:bg-black/60">
                                   <Heart className={\`w-3.5 h-3.5 \${favorites.find(f => f.id === res.id) ? 'fill-pink-400 text-pink-400' : ''}\`} />
                                </button>
                                <button onClick={() => togglePreview(res)} className="p-1.5 bg-black/40 rounded-full text-white/50 hover:text-white hover:bg-black/60">`);

content = content.replace(/VolumeX/g, "Pause");
content = content.replace(/Volume2/g, "Play");

fs.writeFileSync('src/components/PixabayStudio.tsx', content);
