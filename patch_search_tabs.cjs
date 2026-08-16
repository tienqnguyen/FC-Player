const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `                  <div className="flex w-full sm:w-fit self-center gap-1 p-1 bg-black/40 rounded-xl border border-white/5 shrink-0 justify-between sm:justify-start overflow-x-auto scrollbar-hide">
                    <button
                      type="button"
                      onClick={() => {
                        setTiktokSearchType("sound");
                        if (tiktokSearchQuery.trim()) {
                          handleTiktokSearch(undefined, false, "sound");
                        } else {
                          setTiktokSearchResults([]);
                          setTiktokSearchError("");
                        }
                      }}
                      className={\`text-[8px] sm:text-[9px] font-black tracking-wider uppercase px-1.5 py-1.5 rounded-lg transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center whitespace-nowrap \${
                        tiktokSearchType === "sound"
                          ? "bg-amber-400 text-black shadow-md shadow-amber-400/10"
                          : "text-white/40 hover:text-white/75"
                      }\`}
                    >
                      <span className="text-[7px] sm:text-[8px] bg-emerald-500/20 border border-emerald-500/35 text-emerald-400 px-1 py-0.2 rounded font-black">TK</span>
                      <span className="hidden sm:inline">Sound</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTiktokSearchType("video");
                        if (tiktokSearchQuery.trim()) {
                          handleTiktokSearch(undefined, false, "video");
                        } else {
                          setTiktokSearchResults([]);
                          setTiktokSearchError("");
                        }
                      }}
                      className={\`text-[8px] sm:text-[9px] font-black tracking-wider uppercase px-1.5 py-1.5 rounded-lg transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center whitespace-nowrap \${
                        tiktokSearchType === "video"
                          ? "bg-amber-400 text-black shadow-md shadow-amber-400/10"
                          : "text-white/40 hover:text-white/75"
                      }\`}
                    >
                      <span className="text-[7px] sm:text-[8px] bg-purple-500/20 border border-purple-500/35 text-purple-400 px-1 py-0.2 rounded font-black">TK</span>
                      <span className="hidden sm:inline">Video</span>
                    </button>`;

content = content.replace(/<div className="flex w-full sm:w-fit self-center gap-1 p-1 bg-black\/40 rounded-xl border border-white\/5 shrink-0 justify-between sm:justify-start overflow-x-auto scrollbar-hide">/, replacement);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched search tabs");
