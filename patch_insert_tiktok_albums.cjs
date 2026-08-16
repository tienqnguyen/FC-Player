const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const anchor = '              {/* Other Fetched Tracks (YouTube, Facebook, NCT, or custom URLs) */}';

const insertion = `
              {/* TikTok & Community Creators */}
              <div className="mt-5 border-t border-white/5 pt-3 shrink-0">
                <div className="flex items-center justify-between mb-3 px-0.5 mt-2">
                  <div className="flex flex-col">
                    <h3 className="text-xs font-black tracking-widest text-[#E0E2E8]/90 uppercase flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      Creators
                    </h3>
                    <p className="text-[10px] text-white/30 font-semibold tracking-wide">
                      TikTok and Community Profiles
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 items-start content-start">
                  {allAlbums.map((alb) => (
                    <div
                      key={alb.id}
                      onClick={() => fetchAndPlayUserAlbum(alb.username)}
                      className="group flex flex-col gap-1.5 p-1.5 sm:p-2 rounded-[12px] sm:rounded-[14px] cursor-pointer border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300"
                    >
                      <div className="relative w-full aspect-square rounded-[8px] sm:rounded-xl overflow-hidden shrink-0 shadow-md">
                         {alb.avatar ? (
                           <img src={alb.avatar} alt={alb.displayName} className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-110" />
                         ) : (
                           <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center transition-all duration-500 group-hover:scale-110">
                              <span className="text-2xl font-black text-white/20">{alb.avatarSub}</span>
                           </div>
                         )}
                         <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                         <div className="absolute bottom-1.5 right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-400/90 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                           <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current ml-0.5" />
                         </div>
                      </div>
                      <div className="px-0.5 pb-0.5 sm:px-1 sm:pb-1">
                        <h4 className="text-[9px] sm:text-[10px] font-bold text-white/90 group-hover:text-amber-400 transition-colors line-clamp-1 leading-tight">
                          {alb.displayName}
                        </h4>
                        <p className="text-[8px] sm:text-[9px] text-white/40 mt-0.5">@{alb.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Fetched Tracks (YouTube, Facebook, NCT, or custom URLs) */}`;

content = content.replace(anchor, insertion);

fs.writeFileSync('src/App.tsx', content);
console.log("Inserted TikTok Albums!");
