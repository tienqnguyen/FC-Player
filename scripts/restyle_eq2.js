import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const eqStart = `{/* EQ */}`;
const eqEnd = `</div>
                </div>
              </div>
           </div>
        )}

        <audio`;

const startIndex = content.indexOf(eqStart);
const endIndex = content.indexOf(eqEnd);

if (startIndex === -1 || endIndex === -1) {
    console.log("Could not find eq block", startIndex, endIndex);
    process.exit(1);
}

const newEq = `{/* EQ */}
                   <div className="flex-1 flex flex-col min-h-0 mt-2 relative z-10 w-full px-2 lg:px-4">
                      
                      <div className="flex justify-between items-center overflow-x-auto custom-scrollbar relative z-10 flex-1 min-h-[300px]">
                           {eqSettings.map((band, i) => (
                              <div key={i} className="flex flex-col items-center justify-between h-full min-w-[55px] py-4 gap-6 relative">
                                <div className="text-[11px] font-bold tracking-wider text-[#0A84FF] border border-[#0A84FF]/20 bg-[#0A84FF]/5 px-2 py-1.5 rounded-lg flex items-center justify-center w-[44px] text-center">
                                   {band.g.toFixed(1)}
                                </div>
                                
                                <div className="flex-1 w-full flex justify-center relative py-6">
                                    <div className="absolute w-[4px] h-[180px] top-1/2 -translate-y-1/2 bg-[#0A0B10] rounded-full drop-shadow-sm border border-white/5" />
                                    <div className="absolute top-1/2 left-1/2 w-6 h-px bg-white/20 -translate-y-1/2 -translate-x-1/2" />
                                    
                                    <input
                                       type="range"
                                       min="-12"
                                       max="12"
                                       step="0.1"
                                       value={band.g || 0}
                                       onChange={(e) => {
                                         const val = parseFloat(e.target.value);
                                         const newEq = [...eqSettings];
                                         newEq[i].g = val;
                                         setEqSettings(newEq);
                                         updateEqNode?.(i, "gain", val);
                                       }}
                                       className="w-full h-full bg-transparent appearance-none cursor-pointer absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 !origin-center -rotate-90 slider-vertical"
                                       style={{ width: '180px', height: '48px' }}
                                    />
                                </div>

                                <div className="text-[12px] font-bold text-gray-400 tracking-wider h-6 flex items-center justify-center">
                                   {band.name.replace('Hz','').replace('kHz','k')}
                                </div>
                              </div>
                           ))}
                         </div>
                   </div>
                `;

content = content.substring(0, startIndex) + newEq + content.substring(endIndex);
fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Updated Eq");
