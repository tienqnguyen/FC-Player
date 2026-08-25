const fs = require('fs');
let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// I might have injected extra </div> in the wrong place earlier.
// Let's reset the popup component correctly.
const regexPopup = /\{\/\* AI Suggestion Popup for Arrangement \*\/\}[\s\S]*?\{coverUrl && \(/;
const correctPopup = `{/* AI Suggestion Popup for Arrangement */}
            {popupState && popupState.visible && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onMouseDown={() => setPopupState(null)}>
                <div 
                    ref={popupRef}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full max-w-sm bg-[#1a1d24] border border-purple-500/30 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
                >
                    <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-white/90 uppercase tracking-wider">
                            <Wand2 className="w-4 h-4 text-purple-400" />
                            AI Tùy Chỉnh Thẻ
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setPopupState(null); }}
                            className="p-1 hover:bg-white/10 rounded-md text-white/50 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-3 flex flex-col gap-3">
                        <div className="bg-black/40 rounded border border-white/5 p-2">
                            <div className="text-[9px] text-white/40 uppercase font-black mb-1">Đang chọn:</div>
                            <div className="text-xs text-white/80 font-medium break-words">"{popupState.selectedText}"</div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <input
                                type="text"
                                value={suggestInput}
                                onChange={(e) => setSuggestInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAskAITag()}
                                placeholder="Gõ yêu cầu: vd 'làm cho buồn hơn'..."
                                className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                            />
                            <button
                                onClick={handleAskAITag}
                                disabled={!suggestInput.trim() || isSuggesting}
                                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-widest py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                            >
                                {isSuggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                {isSuggesting ? "ĐANG SUY NGHĨ..." : "GỢI Ý TÙY CHỌN"}
                            </button>
                        </div>
                    </div>

                    {suggestError && (
                        <div className="px-3 pb-3 text-red-400 text-xs font-medium text-center">
                            {suggestError}
                        </div>
                    )}

                    {suggestOptions.length > 0 && (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pt-0 border-t border-white/10">
                            <div className="text-[10px] text-white/50 font-bold uppercase tracking-wider mb-2 mt-3">
                                Chọn để thay thế:
                            </div>
                            <div className="flex flex-col gap-2">
                                {suggestOptions.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => { e.stopPropagation(); handleApplyAITag(opt.tag); }}
                                        className="text-left bg-white/5 hover:bg-purple-500/20 border border-white/5 hover:border-purple-500/40 rounded-xl p-2.5 transition-colors group"
                                    >
                                        <div className="font-mono text-xs text-purple-300 mb-1 group-hover:text-purple-200 font-bold">
                                            {opt.tag}
                                        </div>
                                        <div className="text-[11px] text-white/60 group-hover:text-white/80 leading-relaxed">
                                            {opt.explanation}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                </div>
            )}
       {/* Dynamic Cover Artwork Background */}
       {coverUrl && (`;

content = content.replace(regexPopup, correctPopup);

fs.writeFileSync('src/components/StemStudio.tsx', content);
