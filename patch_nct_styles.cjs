const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldBlock = `                  <div className="grid grid-cols-2 gap-3 items-start content-start">
                    {nctAlbums.map((alb) => (
                      <div
                        key={alb.id}
                        onClick={(e) => {
                           handleTiktokFetch(e as any, \`https://www.nhaccuatui.com/playlist/\${alb.id}\`);
                           setPlaylistTab("upnext");
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
                  </div>`;

const newBlock = `                  <div className="grid grid-cols-3 gap-2 sm:gap-3 items-start content-start">
                    {nctAlbums.map((alb) => (
                      <div
                        key={alb.id}
                        onClick={(e) => {
                           handleTiktokFetch(e as any, \`https://www.nhaccuatui.com/playlist/\${alb.id}\`);
                           setPlaylistTab("upnext");
                        }}
                        className="group flex flex-col gap-1.5 p-1.5 sm:p-2 rounded-[12px] sm:rounded-[14px] cursor-pointer border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300"
                      >
                        <div className="relative w-full aspect-square rounded-[8px] sm:rounded-xl overflow-hidden shrink-0 shadow-md">
                           <FallbackImage 
                             src={alb.image} 
                             className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                             alt={alb.title}
                           />
                           <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                           <div className="absolute bottom-1.5 right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-400/90 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                             <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current ml-0.5" />
                           </div>
                        </div>
                        <div className="px-0.5 pb-0.5 sm:px-1 sm:pb-1">
                          <h4 className="text-[9px] sm:text-[10px] font-bold text-white/90 group-hover:text-amber-400 transition-colors line-clamp-2 leading-tight">
                            {alb.title}
                          </h4>
                        </div>
                      </div>
                    ))}
                  </div>`;

content = content.replace(oldBlock, newBlock);
fs.writeFileSync('src/App.tsx', content);
