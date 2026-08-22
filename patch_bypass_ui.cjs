const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const targetUI = `                           {/* Button 5 - Pro / Extreme */}
                           <button onClick={() => setBypassMethod("extreme")} className={\`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left sm:col-span-2 \${bypassMethod === 'extreme' ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-black/60 border-red-500/20 text-white/70 hover:bg-red-500/10'}\`}>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-red-400">Chuyên nghiệp (Pro / Nhiễu loạn)</span>
                                <span className="flex items-center text-[9px] text-red-400 font-bold bg-red-400/10 px-1.5 py-0.5 rounded">ULTIMATE MODE</span>
                              </div>
                              <span className="text-[9px] opacity-70 leading-relaxed text-white/60">Sử dụng mã ASCII, Unicode ẩn, invisible separators, kết hợp tối đa để đánh lừa các filter mạnh nhất.</span>
                           </button>`;

const newUI = `                           {/* Button 5 - Underscore */}
                           <button onClick={() => setBypassMethod("underscore")} className={\`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left \${bypassMethod === 'underscore' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-black/60 border-white/5 text-white/70 hover:bg-white/5'}\`}>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-white">Nối bằng gạch dưới (_)</span>
                                <span className="flex items-center text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">SUNO ★★★★</span>
                              </div>
                              <span className="text-[9px] opacity-70 leading-relaxed text-white/60">Thay thế khoảng trắng (VD: yêu_em). Giúp lách từ cấm ghép nối hiệu quả mà ca sĩ hát vẫn chuẩn.</span>
                           </button>
                           {/* Button 6 - Pro / Extreme */}
                           <button onClick={() => setBypassMethod("extreme")} className={\`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left sm:col-span-2 \${bypassMethod === 'extreme' ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-black/60 border-red-500/20 text-white/70 hover:bg-red-500/10'}\`}>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-red-400">Chuyên nghiệp (Pro / Nhiễu loạn)</span>
                                <span className="flex items-center text-[9px] text-red-400 font-bold bg-red-400/10 px-1.5 py-0.5 rounded">ULTIMATE MODE</span>
                              </div>
                              <span className="text-[9px] opacity-70 leading-relaxed text-white/60">Sử dụng mã ASCII, Unicode ẩn, invisible separators, kết hợp tối đa để đánh lừa các filter mạnh nhất.</span>
                           </button>`;

if (code.includes('Button 5 - Pro / Extreme')) {
    code = code.replace(targetUI, newUI);
    fs.writeFileSync('src/components/StemStudio.tsx', code);
    console.log("Patched bypass UI.");
} else {
    console.log("Target UI not found.");
}
