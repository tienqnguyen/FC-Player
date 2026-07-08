const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove setPlaylistTab("upnext"); for TKaraoke
code = code.replace(
  /setTiktokUrl\(song\.originalUrl\);\n\s*setPlaylistTab\("upnext"\);\n\s*setTimeout/g,
  `setTiktokUrl(song.originalUrl);
                              setTimeout`
);

// 2. Remove setPlaylistTab("upnext"); for TikTok fallback
code = code.replace(
  /setTiktokUrl\(oembedUrl\);\n\s*setPlaylistTab\("upnext"\);\n\s*setTimeout/g,
  `setTiktokUrl(oembedUrl);
                                setTimeout`
);

// 3. Add TK badge to search results
const oldBadges = `
                            {/* Source badges */}
                            {tiktokSearchType === "youtube" ? (
                              <span className="text-[8px] font-black tracking-wider text-red-500 bg-red-500/10 border border-red-500/20 px-1 py-0.5 rounded-md uppercase select-none">YT</span>
                            ) : tiktokSearchType === "nhaccuatui" ? (
                              <span className="text-[8px] font-black tracking-wider text-[#2cc0ff] bg-[#2cc0ff]/10 border border-[#2cc0ff]/20 px-1 py-0.5 rounded-md uppercase select-none">NCT</span>
                            ) : (
                              <span className="text-[8px] font-black tracking-wider text-white/45 bg-white/5 border border-white/10 px-1 py-0.5 rounded-md uppercase select-none">TT</span>
                            )}
`;
const newBadges = `
                            {/* Source badges */}
                            {tiktokSearchType === "youtube" ? (
                              <span className="text-[8px] font-black tracking-wider text-red-500 bg-red-500/10 border border-red-500/20 px-1 py-0.5 rounded-md uppercase select-none">YT</span>
                            ) : tiktokSearchType === "nhaccuatui" ? (
                              <span className="text-[8px] font-black tracking-wider text-[#2cc0ff] bg-[#2cc0ff]/10 border border-[#2cc0ff]/20 px-1 py-0.5 rounded-md uppercase select-none">NCT</span>
                            ) : tiktokSearchType === "tk" ? (
                              <span className="text-[8px] font-black tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1 py-0.5 rounded-md uppercase select-none">TK</span>
                            ) : (
                              <span className="text-[8px] font-black tracking-wider text-white/45 bg-white/5 border border-white/10 px-1 py-0.5 rounded-md uppercase select-none">TT</span>
                            )}
`;
code = code.replace(oldBadges.trim(), newBadges.trim());

// 4. Add "Load More" button after map
const oldMapEnd = `
                    })}
                  </>
                )}
              </div>
            </div>
`;
const newMapEnd = `
                    })}
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
                  </>
                )}
              </div>
            </div>
`;
code = code.replace(oldMapEnd.trim(), newMapEnd.trim());

fs.writeFileSync('src/App.tsx', code);
console.log("Patched jump logic and Load More button.");
