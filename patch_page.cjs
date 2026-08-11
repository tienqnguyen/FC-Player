const fs = require('fs');
let content = fs.readFileSync('src/components/PixabayStudio.tsx', 'utf8');

content = content.replace(/  const \[query, setQuery\] = useState\(""\);/, `  const [query, setQuery] = useState("");\n  const [page, setPage] = useState(1);`);

content = content.replace(/  const fetchSFX = async \(searchQuery: string\) => \{/, `  const fetchSFX = async (searchQuery: string, pageNum: number = 1) => {`);

// Update the fetch call
content = content.replace(/const res = await fetch\(\`\/api\/pixabay\/search\?q=\$\{encodeURIComponent\(searchQuery\)\}\`\);/, 'const res = await fetch(`/api/pixabay/search?q=${encodeURIComponent(searchQuery)}&p=${pageNum}`);');

// When searching from enter key or search button, reset to page 1
content = content.replace(/fetchSFX\(category\)/g, 'fetchSFX(category, 1); setPage(1);');
content = content.replace(/fetchSFX\(query\)/g, 'fetchSFX(query, 1); setPage(1);');

// Add pagination UI next to search results. It's rendered around line 640
content = content.replace(/                       \{results.length === 0 && <div className="text-center p-4 text-xs text-white\/30">No results found<\/div>\}\n                    <\/div>\n                 \)\}/, `                       {results.length === 0 && <div className="text-center p-4 text-xs text-white/30">No results found</div>}
                    </div>
                 )}
                 
                 {/* Pagination */}
                 {!loading && !showFavorites && results.length > 0 && (
                     <div className="flex items-center justify-between pt-2 px-2 border-t border-white/5 mt-2">
                         <button 
                            disabled={page <= 1}
                            onClick={() => { const newPage = page - 1; setPage(newPage); fetchSFX(query || category, newPage); }}
                            className="text-[10px] font-bold text-white/50 hover:text-white disabled:opacity-30 px-2 py-1"
                         >
                             &lt; PREV
                         </button>
                         <span className="text-[10px] text-white/30">PAGE {page}</span>
                         <button 
                            onClick={() => { const newPage = page + 1; setPage(newPage); fetchSFX(query || category, newPage); }}
                            className="text-[10px] font-bold text-white/50 hover:text-white px-2 py-1"
                         >
                             NEXT &gt;
                         </button>
                     </div>
                 )}`);

fs.writeFileSync('src/components/PixabayStudio.tsx', content);
