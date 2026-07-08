const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The click handler:
// } else if (tiktokSearchType === "nhaccuatui") { ... } else { ... TikTok type ... }

const oldCode = `
                            } else if (tiktokSearchType === "nhaccuatui") {
                              // If NhacCuaTui proxy stream url is already loaded!
                              const streamUrl = song.url.includes("api/proxy-stream") 
                                ? song.url 
                                : \`/api/proxy-stream?url=\${encodeURIComponent(song.url)}\`;
                              const newSong = {
                                id: "nct_" + song.id,
                                title: song.title,
                                originalUrl: song.nctLink || \`https://www.nhaccuatui.com/bai-hat/\${song.id}.html\`,
                                audioUrl: streamUrl,
                                cover: song.cover || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100",
                                author: song.author,
                                duration: song.duration,
                                timestamp: Date.now()
                              };
                              setRecentSongs(prev => {
                                const filtered = prev.filter(s => s.id !== newSong.id);
                                return [newSong, ...filtered].slice(0, 50);
                              });
                              playRecentSong(newSong);
                            } else {
                              // TikTok type
`;

const newCode = `
                            } else if (tiktokSearchType === "nhaccuatui") {
                              // If NhacCuaTui proxy stream url is already loaded!
                              const streamUrl = song.url.includes("api/proxy-stream") 
                                ? song.url 
                                : \`/api/proxy-stream?url=\${encodeURIComponent(song.url)}\`;
                              const newSong = {
                                id: "nct_" + song.id,
                                title: song.title,
                                originalUrl: song.nctLink || \`https://www.nhaccuatui.com/bai-hat/\${song.id}.html\`,
                                audioUrl: streamUrl,
                                cover: song.cover || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100",
                                author: song.author,
                                duration: song.duration,
                                timestamp: Date.now()
                              };
                              setRecentSongs(prev => {
                                const filtered = prev.filter(s => s.id !== newSong.id);
                                return [newSong, ...filtered].slice(0, 50);
                              });
                              playRecentSong(newSong);
                            } else if (tiktokSearchType === "tk") {
                              setTiktokUrl(song.originalUrl);
                              setPlaylistTab("upnext");
                              setTimeout(() => {
                                const fakeForm = { preventDefault: () => {} } as React.FormEvent;
                                handleTiktokFetch(fakeForm, song.originalUrl);
                              }, 50);
                            } else {
                              // TikTok type
`;

code = code.replace(oldCode.trim(), newCode.trim());

// Also fix isActive for TKaraoke
const oldIsActive = `
                        if (tiktokSearchType === "youtube") {
                          isActive = (song.url && currentSong.originalUrl === song.url) || (song.id && currentSong.id === song.id);
                        } else if (tiktokSearchType === "nhaccuatui") {
                          isActive = currentSong.id === ("nct_" + song.id);
                        } else {
`;
const newIsActive = `
                        if (tiktokSearchType === "youtube") {
                          isActive = (song.url && currentSong.originalUrl === song.url) || (song.id && currentSong.id === song.id);
                        } else if (tiktokSearchType === "nhaccuatui") {
                          isActive = currentSong.id === ("nct_" + song.id);
                        } else if (tiktokSearchType === "tk") {
                          isActive = currentSong.originalUrl === song.originalUrl;
                        } else {
`;

code = code.replace(oldIsActive.trim(), newIsActive.trim());

fs.writeFileSync('src/App.tsx', code);
console.log("Patched TKaraoke click logic.");
