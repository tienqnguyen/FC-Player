const fs = require('fs');
let content = fs.readFileSync('src/components/PixabayStudio.tsx', 'utf8');

// 1. Remove Any Instrument from INSTRUMENTS
content = content.replace(/const INSTRUMENTS = \["Any Instrument", "Piano", "Guitar", "Bass", "Drums", "Strings", "Synth", "Brass", "Woodwinds", "Percussion", "Vocals", "Pad"\];/, 'const INSTRUMENTS = ["Piano", "Guitar", "Bass", "Drums", "Strings", "Synth", "Brass", "Woodwinds", "Percussion", "Vocals", "Pad"];');

// 2. Change initial category to ""
content = content.replace(/const \[category, setCategory\] = useState\("atmosphere"\);/, 'const [category, setCategory] = useState("");');

// 3. Remove instrument state entirely
content = content.replace(/  const \[instrument, setInstrument\] = useState\("Any Instrument"\);\n/, '');

// 4. Update fetchSFX to use exactly the query, no combination
content = content.replace(/let fullQuery = searchQuery;\n      if \(instrument !== "Any Instrument"\) fullQuery \+= " " \+ instrument;\n      const res = await fetch\(`\/api\/pixabay\/search\?q=\$\{encodeURIComponent\(fullQuery\)\}`\);/, 'const res = await fetch(`/api/pixabay/search?q=${encodeURIComponent(searchQuery)}`);');

// 5. Update the useEffect that triggers fetchSFX on category change to depend on category instead of instrument too
content = content.replace(/  \}, \[category, instrument, activeSearchTrackId\]\);/, '  }, [category, activeSearchTrackId]);');

// 6. Update the UI for CATEGORIES to set category and clear query
content = content.replace(/onClick=\{\(\) => \{ setCategory\(cat\); setShowFavorites\(false\); \}\}/, 'onClick={() => { setCategory(cat); setShowFavorites(false); }}');

// 7. Update the UI for INSTRUMENTS to use category state
content = content.replace(/onClick=\{\(\) => setInstrument\(inst\)\}\n                             className=\{\`px-3 py-1 rounded-full text-\[10px\] uppercase font-bold whitespace-nowrap transition-colors \$\{\n                               instrument === inst \? 'bg-cyan-500 text-black' : 'bg-white\/5 text-slate-300 hover:bg-white\/10'\n                             \}\`\}/g, `onClick={() => { setCategory(inst); setShowFavorites(false); }}
                             className={\`px-3 py-1 rounded-full text-[10px] uppercase font-bold whitespace-nowrap transition-colors \${
                               category === inst ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                             }\`}`);

fs.writeFileSync('src/components/PixabayStudio.tsx', content);
