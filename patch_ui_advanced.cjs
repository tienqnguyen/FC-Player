const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const oldHeaderRegex = /<div className="flex items-center justify-between mb-2">[\s\S]*?<\/button>\s*<\/div>/;
const newHeader = `<div className="flex flex-col gap-2 mb-3">
                           <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-[11px] sm:text-[12px] font-black tracking-wider text-white flex items-center gap-2">
                                 Phương pháp lách Suno AI tối ưu:
                                 <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[8px] uppercase font-bold tracking-widest hidden sm:inline-block">Safe Mode</span>
                              </span>
                              
                              <div className="flex items-center gap-2 ml-auto">
                                 <button
                                    onClick={handleAIBypass}
                                    disabled={(!lyricRaw && !lyricFormatted) || isAIBypassing}
                                    className="bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 border border-amber-500/30 disabled:opacity-40 text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                                    title="Dùng AI (OpenRouter) để tự động sửa lời lách filter"
                                 >
                                    {isAIBypassing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                                    AI One-Click Bypass
                                 </button>

                                 <button
                                    onClick={handleApplyAdvancedBypass}
                                    disabled={(!lyricRaw && !lyricFormatted) || bypassMethod === 'none' || isAIBypassing}
                                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border border-indigo-400/30"
                                 >
                                    <Wand2 className="w-3 h-3" />
                                    Apply Logic Bypass
                                 </button>
                              </div>
                           </div>
                           
                           <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-black/40 border border-amber-500/20 p-2 rounded-lg">
                               <input
                                   type="password"
                                   placeholder="Nhập OpenRouter API Key để dùng AI One-Click (sk-or-v1-...)..."
                                   value={openRouterKey}
                                   onChange={(e) => {
                                       setOpenRouterKey(e.target.value);
                                       localStorage.setItem("openrouter_key", e.target.value);
                                   }}
                                   className="flex-1 bg-transparent text-[9px] text-white/80 focus:outline-none placeholder-white/30"
                               />
                               {aiBypassStatus && <span className="text-[9px] text-amber-400 font-medium whitespace-nowrap">{aiBypassStatus}</span>}
                           </div>
                        </div>`;

code = code.replace(oldHeaderRegex, newHeader);


const oldIntensityRegex = /<div className="grid grid-cols-3 gap-2">[\s\S]*?<\/div>/;
const newIntensity = `<div className="grid grid-cols-4 gap-2">
                              <button onClick={() => setBypassIntensity('minimal')} className={\`py-2 px-1 sm:px-2 border rounded-lg text-[8px] sm:text-[9px] font-bold transition-all \${bypassIntensity === 'minimal' ? 'bg-indigo-500/30 border-indigo-500 text-indigo-300' : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/10'}\`}>Rất ít (15%)</button>
                              <button onClick={() => setBypassIntensity('low')} className={\`py-2 px-1 sm:px-2 border rounded-lg text-[8px] sm:text-[9px] font-bold transition-all \${bypassIntensity === 'low' ? 'bg-indigo-500/30 border-indigo-500 text-indigo-300' : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/10'}\`}>Ít (35%)</button>
                              <button onClick={() => setBypassIntensity('medium')} className={\`py-2 px-1 sm:px-2 border rounded-lg text-[8px] sm:text-[9px] font-bold transition-all \${bypassIntensity === 'medium' ? 'bg-indigo-500/30 border-indigo-500 text-indigo-300' : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/10'}\`}>Vừa (65%)</button>
                              <button onClick={() => setBypassIntensity('high')} className={\`py-2 px-1 sm:px-2 border rounded-lg text-[8px] sm:text-[9px] font-bold transition-all \${bypassIntensity === 'high' ? 'bg-indigo-500/30 border-indigo-500 text-indigo-300' : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/10'}\`}>Nhiều (95%)</button>
                           </div>`;

code = code.replace(oldIntensityRegex, newIntensity);


// Add Button 5 to grid
const oldGridRegex = /<button onClick=\{\(\) => setBypassMethod\("alternating"\)\} className=\{`p-3 border rounded-xl flex flex-col items-start gap-1\.5 transition-all text-left \$\{bypassMethod === 'alternating' \? 'bg-indigo-500\/20 border-indigo-500 text-indigo-300 shadow-\[0_0_15px_rgba\(99,102,241,0\.15\)\]' : 'bg-black\/60 border-white\/5 text-white\/70 hover:bg-white\/5'\}`\}>[\s\S]*?<\/button>/;

code = code.replace(oldGridRegex, match => {
  return match + `
                           {/* Button 5 - Pro / Extreme */}
                           <button onClick={() => setBypassMethod("extreme")} className={\`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left sm:col-span-2 \${bypassMethod === 'extreme' ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-black/60 border-red-500/20 text-white/70 hover:bg-red-500/10'}\`}>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-red-400">Chuyên nghiệp (Pro / Nhiễu loạn)</span>
                                <span className="flex items-center text-[9px] text-red-400 font-bold bg-red-400/10 px-1.5 py-0.5 rounded">ULTIMATE MODE</span>
                              </div>
                              <span className="text-[9px] opacity-70 leading-relaxed text-white/60">Sử dụng mã ASCII, Unicode ẩn, invisible separators, kết hợp tối đa để đánh lừa các filter mạnh nhất.</span>
                           </button>`;
});

fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Patched advanced UI components");
