const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. TikTok Albums from 2 cols to 3 cols
content = content.replace(
  '<div className="grid grid-cols-2 gap-2 sm:gap-3 items-start content-start">\\n                  {allAlbums.map',
  '<div className="grid grid-cols-3 gap-2 sm:gap-3 items-start content-start">\\n                  {allAlbums.map'
);
content = content.replace(
  '<div className="grid grid-cols-2 gap-2 sm:gap-3 items-start content-start">\n                  {allAlbums.map',
  '<div className="grid grid-cols-3 gap-2 sm:gap-3 items-start content-start">\n                  {allAlbums.map'
);

// 2. Add isNctAlbumsExpanded state
if (!content.includes('const [isNctExpanded, setIsNctExpanded]')) {
  content = content.replace(
    'const [nctAlbums, setNctAlbums] = useState<any[]>',
    'const [isNctExpanded, setIsNctExpanded] = useState(false);\n  const [nctAlbums, setNctAlbums] = useState<any[]>'
  );
}

// 3. Slice NCT albums and add toggle button
content = content.replace(
  '{nctAlbums.map((alb) => (',
  '{(isNctExpanded ? nctAlbums : nctAlbums.slice(0, 6)).map((alb) => ('
);

content = content.replace(
  /Trending playlists from NhacCuaTui\s*<\/p>\s*<\/div>\s*<\/div>/,
  `Trending playlists from NhacCuaTui
                    </p>
                  </div>
                  <button
                    onClick={() => setIsNctExpanded(!isNctExpanded)}
                    className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white/60 hover:text-white transition-all flex items-center gap-1 shrink-0"
                  >
                    {isNctExpanded ? "Show Less" : "Show All"}
                  </button>
                </div>`
);


fs.writeFileSync('src/App.tsx', content);
console.log("Patched albums layout and expand");
