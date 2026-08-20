const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const advancedUI = `
                     {/* Advanced Suno Bypass Generator */}
                     <div className="flex flex-col gap-2 pt-2 pb-2 border-t border-white/10 mt-1">
                        <div className="flex items-center justify-between mb-1">
                           <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-400">
                              Advanced Suno AI Bypass (Generator)
                           </span>
                           <button
                              onClick={handleApplyAdvancedBypass}
                              disabled={(!lyricRaw && !lyricFormatted) || bypassMethod === 'none'}
                              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 sm:px-3 py-1 rounded-full transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                           >
                              <Wand2 className="w-3 h-3" />
                              Apply Bypass
                           </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mb-1">
                           <button onClick={() => setBypassMethod("hyphen")} className={\`p-1.5 sm:p-2 border rounded-lg flex flex-col items-center gap-1 transition-colors \${bypassMethod === 'hyphen' ? 'bg-amber-400/20 border-amber-400 text-amber-300' : 'bg-black/40 border-white/10 text-white/60 hover:bg-white/5'}\`}>
                              <span className="text-[10px] font-bold">Dấu gạch ngang (-)</span>
                              <span className="text-[7.5px] opacity-70 text-center">Khuyên dùng, mượt mà</span>
                           </button>
                           <button onClick={() => setBypassMethod("zerowidth")} className={\`p-1.5 sm:p-2 border rounded-lg flex flex-col items-center gap-1 transition-colors \${bypassMethod === 'zerowidth' ? 'bg-amber-400/20 border-amber-400 text-amber-300' : 'bg-black/40 border-white/10 text-white/60 hover:bg-white/5'}\`}>
                              <span className="text-[10px] font-bold">Ký tự ẩn siêu cấp</span>
                              <span className="text-[7.5px] opacity-70 text-center">Mã zero-width, ẩn</span>
                           </button>
                           <button onClick={() => setBypassMethod("homoglyph")} className={\`p-1.5 sm:p-2 border rounded-lg flex flex-col items-center gap-1 transition-colors \${bypassMethod === 'homoglyph' ? 'bg-amber-400/20 border-amber-400 text-amber-300' : 'bg-black/40 border-white/10 text-white/60 hover:bg-white/5'}\`}>
                              <span className="text-[10px] font-bold">Ký tự đồng dạng</span>
                              <span className="text-[7.5px] opacity-70 text-center">Latin/Cyrillic xen kẽ</span>
                           </button>
                           <button onClick={() => setBypassMethod("alternating")} className={\`p-1.5 sm:p-2 border rounded-lg flex flex-col items-center gap-1 transition-colors \${bypassMethod === 'alternating' ? 'bg-amber-400/20 border-amber-400 text-amber-300' : 'bg-black/40 border-white/10 text-white/60 hover:bg-white/5'}\`}>
                              <span className="text-[10px] font-bold">Chữ xen kẽ (AaOo)</span>
                              <span className="text-[7.5px] opacity-70 text-center">Hoa/thường ngẫu nhiên</span>
                           </button>
                        </div>
                        
                        {(bypassMethod === 'hyphen' || bypassMethod === 'zerowidth') && (
                           <div className="flex flex-wrap items-center justify-between bg-black/30 p-2 rounded-lg border border-white/5 mb-1 gap-2">
                              <span className="text-[8.5px] font-bold text-white/80 shrink-0">Kiểu ngắt nhịp:</span>
                              <div className="flex flex-wrap gap-2">
                                 <label className="flex items-center gap-1 text-[8.5px] text-white/70 cursor-pointer hover:text-white">
                                    <input type="radio" checked={hyphenStyle === 'consonant'} onChange={() => setHyphenStyle('consonant')} className="accent-amber-400 w-3 h-3" />
                                    Phân tách Phụ âm đầu
                                 </label>
                                 <label className="flex items-center gap-1 text-[8.5px] text-white/70 cursor-pointer hover:text-white">
                                    <input type="radio" checked={hyphenStyle === 'auto'} onChange={() => setHyphenStyle('auto')} className="accent-amber-400 w-3 h-3" />
                                    Cắt đôi từ tự động
                                 </label>
                              </div>
                           </div>
                        )}
                        
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between mb-1">
                           <div className="flex items-center gap-2">
                              <span className="text-[8.5px] font-bold text-white/80 shrink-0">Mức độ lách (Tỉ lệ lấp đầy ký tự):</span>
                              <select value={bypassIntensity} onChange={(e) => setBypassIntensity(e.target.value as any)} className="bg-black/50 border border-white/10 text-white text-[8.5px] rounded px-1.5 py-0.5 focus:outline-none focus:border-amber-400/50">
                                 <option value="low">Ít (35%)</option>
                                 <option value="medium">Vừa (65%)</option>
                                 <option value="high">Nhiều (95%)</option>
                              </select>
                           </div>
                           <label className="flex items-center gap-1 text-[8.5px] font-bold text-emerald-400 cursor-pointer bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                              <input type="checkbox" checked={protectTags} onChange={(e) => setProtectTags(e.target.checked)} className="accent-emerald-400 w-3 h-3" />
                              Tự động bảo vệ thẻ cấu trúc [Chorus]...
                           </label>
                        </div>

                        <div className="flex flex-col gap-1 border-t border-white/10 pt-2 mt-1">
                           <div className="flex items-center justify-between">
                              <label className="flex items-center gap-1.5 text-[9px] font-bold text-white/90 cursor-pointer">
                                 <input type="checkbox" checked={preserveSensitive} onChange={(e) => setPreserveSensitive(e.target.checked)} className="accent-indigo-400 w-3 h-3" />
                                 Giữ nguyên các từ phát âm nhạy cảm
                              </label>
                              <button onClick={() => setShowSensitiveWords(!showSensitiveWords)} className="text-[8px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer">
                                 {showSensitiveWords ? "Ẩn danh sách" : "Xem danh sách từ giữ nguyên"}
                              </button>
                           </div>
                           {showSensitiveWords && (
                              <div className="bg-black/50 border border-indigo-500/20 p-2 rounded-lg mt-1">
                                 <p className="text-[8px] text-white/50 mb-1">Các từ dễ phát âm sai sẽ không bị lách để đảm bảo TTS chuẩn xác:</p>
                                 <textarea
                                    value={sensitiveWords.join(", ")}
                                    onChange={(e) => setSensitiveWords(e.target.value.split(",").map(w => w.trim()).filter(Boolean))}
                                    className="w-full bg-black/60 border border-white/10 text-white/70 text-[8.5px] font-mono focus:outline-none focus:border-indigo-500/50 resize-none h-16 p-2 rounded custom-scrollbar leading-relaxed"
                                 />
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Default Quick Fix Presets (Suno Bypass Shortcuts - Multi-Pick Supported) */}
`;

code = code.replace(/\{\/\* Default Quick Fix Presets \(Suno Bypass Shortcuts - Multi-Pick Supported\) \*\/\}/, advancedUI);

fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Patched advanced UI");
