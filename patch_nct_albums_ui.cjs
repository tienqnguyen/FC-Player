const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Insert state for NCT Albums
const stateCode = `  const [nctAlbums, setNctAlbums] = useState<any[]>([]);
  const [isFetchingNctAlbums, setIsFetchingNctAlbums] = useState(false);

  const fetchNctAlbums = async () => {
    if (nctAlbums.length > 0) return; // Already fetched
    setIsFetchingNctAlbums(true);
    try {
      const res = await fetch('/api/nhaccuatui/albums');
      const data = await res.json();
      if (data.success && data.albums) {
        setNctAlbums(data.albums);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingNctAlbums(false);
    }
  };

  useEffect(() => {
    if (playlistTab === "albums") {
      fetchNctAlbums();
    }
  }, [playlistTab]);
`;

content = content.replace(/  const \[tiktokAlbums, setTiktokAlbums\] = useState<any\[\]>\(\(\) => \{/, stateCode + '\n  const [tiktokAlbums, setTiktokAlbums] = useState<any[]>(() => {');

// Render NCT Albums instead of TikTok Albums
const renderCode = `                {/* NCT Top Albums */}
                <div className="flex items-center justify-between mb-3 px-0.5 mt-2">
                  <div className="flex flex-col">
                    <h3 className="text-xs font-black tracking-widest text-[#E0E2E8]/90 uppercase flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-amber-400" />
                      Top Albums
                    </h3>
                    <p className="text-[10px] text-white/30 font-semibold tracking-wide">
                      Trending playlists from NhacCuaTui
                    </p>
                  </div>
                </div>
                
                {isFetchingNctAlbums ? (
                  <div className="flex justify-center items-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 items-start content-start">
                    {nctAlbums.map((alb) => (
                      <div
                        key={alb.id}
                        onClick={() => {
                           handleTiktokSearch(undefined, false, "nhaccuatui", \`https://www.nhaccuatui.com/playlist/\${alb.id}\`);
                           setPlaylistTab("search");
                        }}
                        className="group flex flex-col gap-2 p-2 rounded-[16px] cursor-pointer border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300"
                      >
                        <div className="relative w-full aspect-square rounded-xl overflow-hidden shrink-0 shadow-lg">
                           <FallbackImage 
                             src={alb.image} 
                             className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                             alt={alb.title}
                           />
                           <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                           <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-amber-400/90 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                             <Play className="w-4 h-4 fill-current ml-0.5" />
                           </div>
                        </div>
                        <div className="px-1 pb-1">
                          <h4 className="text-[11px] font-bold text-white/90 group-hover:text-amber-400 transition-colors line-clamp-2 leading-tight">
                            {alb.title}
                          </h4>
                        </div>
                      </div>
                    ))}
                  </div>
                )}`;

content = content.replace(/                \{\/\* TikTok Albums are currently hidden due to API issues \*\/\}\n                \{false && \(\n                <div className="grid grid-cols-2 gap-3 items-start content-start">\n              \{allAlbums\.map\(\(alb\) => \{\n[\s\S]*?              <\/div>\n              \)\}/, renderCode);

fs.writeFileSync('src/App.tsx', content);
