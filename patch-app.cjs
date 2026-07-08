const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add "tk" to tiktokSearchType
code = code.replace(
  /useState<"sound" \| "video" \| "youtube" \| "nhaccuatui">/,
  `useState<"sound" | "video" | "youtube" | "nhaccuatui" | "tk">`
);

// 2. Add searchPage state
if (!code.includes('const [searchPage, setSearchPage]')) {
  code = code.replace(
    /const \[tiktokSearchResults, setTiktokSearchResults\] = useState<any\[\]>\(\[\]\);/,
    `const [tiktokSearchResults, setTiktokSearchResults] = useState<any[]>([]);\n  const [searchPage, setSearchPage] = useState(1);`
  );
}

// 3. Update handleTiktokSearch
const oldHandleTiktokSearch = `
  const handleTiktokSearch = async (
    e?: React.FormEvent,
    isLoadMore = false,
    typeOverride?: string,
    queryOverride?: string
  ) => {
    if (e) e.preventDefault();
    const activeType = typeOverride || tiktokSearchType;
    const activeQuery = (queryOverride !== undefined ? queryOverride : tiktokSearchQuery).trim();
    
    if (!activeQuery) return;
    
    setIsSearchingTiktok(true);
    setTiktokSearchError("");
    setShowSuggestions(false);
    
    // Add to recent searches
    setRecentSearches(prev => {
      const filtered = prev.filter(t => t.toLowerCase() !== activeQuery.toLowerCase());
      return [activeQuery, ...filtered].slice(0, 8);
    });
    
    try {
      let endpoint = "";
      if (activeType === "youtube") {
        endpoint = \`/api/youtube/search?q=\${encodeURIComponent(activeQuery)}\`;
      } else if (activeType === "nhaccuatui") {
        endpoint = \`/api/nct-search?q=\${encodeURIComponent(activeQuery)}\`;
      } else {
        // TikTok search ('sound' or 'video')
        endpoint = \`/api/tiktok/search?type=\${activeType}&q=\${encodeURIComponent(activeQuery)}\`;
      }
      
      const res = await fetch(endpoint);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search request failed");
      }
      
      const data = await res.json();
      setTiktokSearchResults(data.videos || []);
    } catch (err: any) {
      console.error(err);
      setTiktokSearchError(err.message || "Failed to find search results. Please try another query.");
    } finally {
      setIsSearchingTiktok(false);
    }
  };
`;

const newHandleTiktokSearch = `
  const handleTiktokSearch = async (
    e?: React.FormEvent,
    isLoadMore = false,
    typeOverride?: string,
    queryOverride?: string
  ) => {
    if (e) e.preventDefault();
    const activeType = typeOverride || tiktokSearchType;
    const activeQuery = (queryOverride !== undefined ? queryOverride : tiktokSearchQuery).trim();
    
    if (!activeQuery) return;
    
    if (!isLoadMore) setSearchPage(1);
    const pageToFetch = isLoadMore ? searchPage + 1 : 1;

    setIsSearchingTiktok(true);
    
    if (!isLoadMore) {
      setTiktokSearchError("");
      setShowSuggestions(false);
      
      // Add to recent searches
      setRecentSearches(prev => {
        const filtered = prev.filter(t => t.toLowerCase() !== activeQuery.toLowerCase());
        return [activeQuery, ...filtered].slice(0, 8);
      });
    }
    
    try {
      let endpoint = "";
      if (activeType === "youtube") {
        endpoint = \`/api/youtube/search?q=\${encodeURIComponent(activeQuery)}\`;
      } else if (activeType === "nhaccuatui") {
        endpoint = \`/api/nct-search?q=\${encodeURIComponent(activeQuery)}\`;
      } else if (activeType === "tk") {
        endpoint = \`/api/tk-search?q=\${encodeURIComponent(activeQuery)}&p=\${pageToFetch}\`;
      } else {
        // TikTok search ('sound' or 'video')
        endpoint = \`/api/tiktok/search?type=\${activeType}&q=\${encodeURIComponent(activeQuery)}\`;
      }
      
      const res = await fetch(endpoint);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search request failed");
      }
      
      const data = await res.json();
      
      if (isLoadMore) {
         setTiktokSearchResults(prev => [...prev, ...(data.videos || [])]);
         setSearchPage(pageToFetch);
      } else {
         setTiktokSearchResults(data.videos || []);
      }
    } catch (err: any) {
      console.error(err);
      if (!isLoadMore) {
        setTiktokSearchError(err.message || "Failed to find search results. Please try another query.");
      }
    } finally {
      setIsSearchingTiktok(false);
    }
  };
`;

code = code.replace(oldHandleTiktokSearch.trim(), newHandleTiktokSearch.trim());

// If replace failed, we must try matching loosely
if (!code.includes('pageToFetch')) {
   // Let's do a more robust regex replacement since spacing might differ
   console.log("Regex replacing handleTiktokSearch");
   const regex = /const handleTiktokSearch = async \([\s\S]*?setIsSearchingTiktok\(false\);\n\s*\}\n\s*\};/;
   code = code.replace(regex, newHandleTiktokSearch.trim());
}

// 4. Add "TK" tab in the UI
const tkTab = `
                    <button
                      type="button"
                      onClick={() => {
                        setTiktokSearchType("tk");
                        if (tiktokSearchQuery.trim()) {
                          handleTiktokSearch(undefined, false, "tk");
                        } else {
                          setTiktokSearchResults([]);
                          setTiktokSearchError("");
                        }
                      }}
                      className={\`text-[9px] font-black tracking-wider uppercase px-2 py-2 rounded-lg transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center whitespace-nowrap \${
                        tiktokSearchType === "tk"
                          ? "bg-amber-400 text-black shadow-md shadow-amber-400/10"
                          : "text-white/40 hover:text-white/75"
                      }\`}
                    >
                      <span className="text-[8px] bg-purple-500/20 border border-purple-500/35 text-purple-400 px-1 py-0.2 rounded font-black">TK</span>
                      <span className="hidden sm:inline">TKaraoke</span>
                    </button>
`;

if (!code.includes('setTiktokSearchType("tk")')) {
  code = code.replace(
    /(onClick=\{\(\) => \{\n\s*setTiktokSearchType\("nhaccuatui"\);[\s\S]*?<\/button>)/,
    `$1\n${tkTab}`
  );
}

// 5. Update input placeholder
code = code.replace(
  /tiktokSearchType === "nhaccuatui"\n\s*\? "Search NhacCuaTui Vietnamese songs\.\.\."/,
  `tiktokSearchType === "nhaccuatui"\n                            ? "Search NhacCuaTui Vietnamese songs..."\n                            : tiktokSearchType === "tk"\n                            ? "Search TKaraoke lyrics..."`
);

// 6. Update search result type label
code = code.replace(
  /\} else if \(tiktokSearchType === "nhaccuatui"\) \{/,
  `} else if (tiktokSearchType === "nhaccuatui") {`
);

// Add "Load More" button at the bottom of search results if it's TKaraoke
const loadMoreBtn = `
                    {tiktokSearchType === "tk" && tiktokSearchResults.length > 0 && !isSearchingTiktok && (
                      <div className="flex justify-center mt-4 mb-8">
                        <button
                          onClick={() => handleTiktokSearch(undefined, true, "tk")}
                          className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider px-6 py-2 rounded-full transition-all"
                        >
                          Load More
                        </button>
                      </div>
                    )}
`;
if (!code.includes('Load More')) {
  code = code.replace(
    /(<\/div>\n\s*<\/div>\n\s*\)\}\n\s*<\/div>\n\s*<\/div>\n\s*\)\}\n\s*\{\/\* Main Playlist Content \*\/})/,
    `\n${loadMoreBtn}\n$1`
  );
}

fs.writeFileSync('src/App.tsx', code);
console.log("Patched src/App.tsx");
