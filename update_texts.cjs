const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const regex = /\{\/\* Advanced Suno Bypass Generator \*\/\}.*?\{\/\* Default Quick Fix Presets \(Suno Bypass Shortcuts - Multi-Pick Supported\) \*\/\}/s;

const newUI = `
                     {/* Advanced Suno Bypass Generator */}
                     <div className="flex flex-col gap-3 pt-3 pb-2 border-t border-white/10 mt-2 bg-black/30 rounded-xl p-3 border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[11px] sm:text-[12px] font-black tracking-wider text-white flex items-center gap-2">
                              Phương pháp lách Suno AI tối ưu:
                              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[8px] uppercase font-bold tracking-widest">Safe Mode active</span>
                           </span>
                           <button
                              onClick={handleApplyAdvancedBypass}
                              disabled={(!lyricRaw && !lyricFormatted) || bypassMethod === 'none'}
                              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-3 sm:px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border border-indigo-400/30"
                           >
                              <Wand2 className="w-3.5 h-3.5" />
                              Apply Bypass
                           </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-2">
                           {/* Button 1 */}
                           <button onClick={() => setBypassMethod("hyphen")} className={\`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left \${bypassMethod === 'hyphen' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-black/60 border-white/5 text-white/70 hover:bg-white/5'}\`}>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-white">Dấu gạch ngang (-)</span>
                                <span className="flex items-center text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">SUNO ★★★★★</span>
                              </div>
                              <span className="text-[9px] opacity-70 leading-relaxed text-white/60">Khuyên dùng thực tế! Lách chuẩn 100%. Khi đi kèm cách ngắt Phụ âm đầu sẽ hát mượt mà, không vấp, hoàn hảo cho Suno AI.</span>
                           </button>
                           {/* Button 2 */}
                           <button onClick={() => setBypassMethod("zerowidth")} className={\`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left \${bypassMethod === 'zerowidth' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-black/60 border-white/5 text-white/70 hover:bg-white/5'}\`}>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-white">Ký tự ẩn siêu cấp</span>
                                <span className="flex items-center text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">SUNO ★★★★<span className="opacity-30">★</span></span>
                              </div>
                              <span className="text-[9px] opacity-70 leading-relaxed text-white/60">Chèn mã zero-width (trống). Không hiển thị với người đọc, hát mượt nhưng một số bộ lọc Suno v4 mới bắt đầu quét kỹ hơn.</span>
                           </button>
                           {/* Button 3 */}
                           <button onClick={() => setBypassMethod("homoglyph")} className={\`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left \${bypassMethod === 'homoglyph' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-black/60 border-white/5 text-white/70 hover:bg-white/5'}\`}>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-white">Ký tự đồng dạng (Homoglyph)</span>
                                <span className="flex items-center text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">SUNO ★★★★<span className="opacity-30">★</span></span>
                              </div>
                              <span className="text-[9px] opacity-70 leading-relaxed text-white/60">Thay thế thành ký tự Latin/Cyrillic đồng dạng. Trông giống hệt 100%, ca sĩ dễ nhìn, bộ lọc Suno đôi khi phát hiện.</span>
                           </button>
                           {/* Button 4 */}
                           <button onClick={() => setBypassMethod("alternating")} className={\`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left \${bypassMethod === 'alternating' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-black/60 border-white/5 text-white/70 hover:bg-white/5'}\`}>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-white">Chữ xen kẽ (AaOo)</span>
                                <span className="flex items-center text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">SUNO ★★★<span className="opacity-30">★★</span></span>
                              </div>
                              <span className="text-[9px] opacity-70 leading-relaxed text-white/60">Đổi ngẫu nhiên kí tự Hoa/Thường xen kẽ. Suno vẫn phát âm chuẩn, cấu trúc chữ hơi khó nhìn nhưng lách tạm ổn.</span>
                           </button>
                        </div>
                        
                        {(bypassMethod === 'hyphen' || bypassMethod === 'zerowidth') && (
                           <div className="flex flex-col bg-black/40 p-3 rounded-xl border border-white/10 mb-2 gap-3 relative">
                              <div className="flex flex-col gap-0.5">
                                 <span className="text-[11px] font-bold text-white">Kiểu ngắt nhịp (Hyphenation style):</span>
                                 <span className="text-[9px] text-white/50">Quyết định vị trí ngắt của ký tự bổ trợ</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                 <label className={\`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all \${hyphenStyle === 'consonant' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-black/40 border-white/5 hover:bg-white/5'}\`}>
                                    <div className="flex items-center gap-2 mb-1">
                                       <input type="radio" checked={hyphenStyle === 'consonant'} onChange={() => setHyphenStyle('consonant')} className="hidden" />
                                       <span className={\`text-[10px] font-bold \${hyphenStyle === 'consonant' ? 'text-white' : 'text-white/60'}\`}>Phân tách Phụ âm đầu</span>
                                    </div>
                                    <span className="text-[8.5px] text-emerald-400/80">Ví dụ: tr-ường, nh-ớ, y-êu</span>
                                 </label>
                                 <label className={\`flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all \${hyphenStyle === 'auto' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-black/40 border-white/5 hover:bg-white/5'}\`}>
                                    <div className="flex items-center gap-2 mb-1">
                                       <input type="radio" checked={hyphenStyle === 'auto'} onChange={() => setHyphenStyle('auto')} className="hidden" />
                                       <span className={\`text-[10px] font-bold \${hyphenStyle === 'auto' ? 'text-white' : 'text-white/60'}\`}>Cắt đôi từ tự động</span>
                                    </div>
                                    <span className="text-[8.5px] text-white/40">Ví dụ: trư-ờng, n-hớ, y-êu</span>
                                 </label>
                              </div>
                              <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
                                 <span className="text-[12px]">💡</span>
                                 <span className="text-[9px] text-emerald-400 leading-relaxed font-medium"><strong>Khuyên dùng cho Suno AI:</strong> Chế độ Phân tách Phụ âm đầu giúp công nghệ TTS (phát âm) của Suno tự động bắt nhịp và ghép vần cực mượt từ phụ âm sang nguyên âm mà không hề bị ngắc ngứ hay đọc từ "gạch"!</span>
                              </div>
                           </div>
                        )}
                        
                        <div className="flex flex-col gap-2 mb-2">
                           <span className="text-[11px] font-bold text-white">Mức độ lách (Tỉ lệ lấp đầy ký tự):</span>
                           <div className="grid grid-cols-3 gap-2">
                              <button onClick={() => setBypassIntensity('low')} className={\`py-2 px-2 border rounded-lg text-[9px] font-bold transition-all \${bypassIntensity === 'low' ? 'bg-indigo-500/30 border-indigo-500 text-indigo-300' : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/10'}\`}>Ít (35%)</button>
                              <button onClick={() => setBypassIntensity('medium')} className={\`py-2 px-2 border rounded-lg text-[9px] font-bold transition-all \${bypassIntensity === 'medium' ? 'bg-indigo-500/30 border-indigo-500 text-indigo-300' : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/10'}\`}>Vừa (65%)</button>
                              <button onClick={() => setBypassIntensity('high')} className={\`py-2 px-2 border rounded-lg text-[9px] font-bold transition-all \${bypassIntensity === 'high' ? 'bg-indigo-500/30 border-indigo-500 text-indigo-300' : 'bg-black/40 border-white/5 text-white/50 hover:bg-white/10'}\`}>Nhiều (95%)</button>
                           </div>
                        </div>

                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg mb-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse"></div>
                           <span className="text-[9.5px] text-emerald-400/90 font-medium leading-relaxed">
                              <strong>Tự động bảo vệ thẻ cấu trúc của Suno:</strong> Các nhãn như [Chorus], [Verse], [Guitar Solo]... được bảo đảm không bị biến đổi để tránh làm sai nhịp AI.
                           </span>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-white/10 pt-3 mt-1 bg-black/20 rounded-xl p-3">
                           <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-0.5">
                                 <span className="text-[11px] font-bold text-white">Giữ nguyên các từ phát âm nhạy cảm</span>
                                 <span className="text-[9px] text-white/50">Không chèn ký tự lạ vào các chữ dễ phát âm sai hoặc nhầm lẫn nguyên âm</span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={preserveSensitive} onChange={(e) => setPreserveSensitive(e.target.checked)} className="sr-only peer" />
                                <div className="w-8 h-4.5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-500"></div>
                              </label>
                           </div>
                           
                           <div className="mt-2">
                              <button onClick={() => setShowSensitiveWords(!showSensitiveWords)} className="flex items-center gap-1 text-[9px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                                 <span className={\`transform transition-transform \${showSensitiveWords ? '' : '-rotate-90'}\`}>▼</span>
                                 {showSensitiveWords ? "Thu nhỏ danh sách từ giữ nguyên" : "Mở rộng danh sách từ giữ nguyên"}
                              </button>
                           </div>
                           
                           {showSensitiveWords && (
                              <div className="bg-black/60 border border-white/10 p-3 rounded-lg mt-1 relative group">
                                 <textarea
                                    value={sensitiveWords.join(", ")}
                                    onChange={(e) => setSensitiveWords(e.target.value.split(",").map(w => w.trim()).filter(Boolean))}
                                    className="w-full bg-transparent text-white/80 text-[10px] font-mono focus:outline-none focus:border-indigo-500/50 resize-none h-20 rounded custom-scrollbar leading-relaxed"
                                 />
                                 <p className="text-[8px] text-white/40 mt-2 leading-relaxed italic border-t border-white/5 pt-2">Ca sĩ Suno AI rất dễ hát sai âm khi gặp các tổ hợp âm khó hoặc lệch dấu chữ quốc ngữ. Việc bảo vệ các từ này giúp nhịp điệu mượt mà nhất.</p>
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Default Quick Fix Presets (Suno Bypass Shortcuts - Multi-Pick Supported) */}
`;

code = code.replace(regex, newUI);

fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Patched advanced UI text layout");
