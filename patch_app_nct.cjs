const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the nctAlbums state and fetchNctAlbums function
const oldState = `  const [nctAlbums, setNctAlbums] = useState<any[]>([]);
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
  };`;

const newState = `  const [nctAlbums, setNctAlbums] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("nct_albums_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - parsed.timestamp < ONE_WEEK && parsed.data) {
          return parsed.data;
        }
      }
    } catch (e) {}
    return [];
  });
  const [isFetchingNctAlbums, setIsFetchingNctAlbums] = useState(false);

  const fetchNctAlbums = async () => {
    if (nctAlbums.length > 0) return; // Already fetched from cache or memory
    setIsFetchingNctAlbums(true);
    try {
      const res = await fetch('/api/nhaccuatui/albums');
      const data = await res.json();
      if (data.success && data.albums) {
        setNctAlbums(data.albums);
        localStorage.setItem("nct_albums_cache", JSON.stringify({
          timestamp: Date.now(),
          data: data.albums
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingNctAlbums(false);
    }
  };`;

content = content.replace(oldState, newState);

// Update onClick
const oldOnClick = `                        onClick={() => {
                           handleTiktokSearch(undefined, false, "nhaccuatui", \`https://www.nhaccuatui.com/playlist/\${alb.id}\`);
                           setPlaylistTab("search");
                        }}`;
const newOnClick = `                        onClick={(e) => {
                           handleTiktokFetch(e as any, \`https://www.nhaccuatui.com/playlist/\${alb.id}\`);
                           setPlaylistTab("upnext");
                        }}`;
                        
content = content.replace(oldOnClick, newOnClick);

fs.writeFileSync('src/App.tsx', content);
