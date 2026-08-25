const fs = require('fs');

let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// 1. Add selectionTimeoutRef and update handleSelectArranged
content = content.replace(
/  const handleSelectArranged = \(e: React\.MouseEvent<HTMLTextAreaElement> \| React\.KeyboardEvent<HTMLTextAreaElement>\) => \{[\s\S]*?setSuggestOptions\(\[\]\); setSuggestInput\(""\); setSuggestError\(""\);\n        \}\n  \};/,
`  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSelectArranged = (e: React.MouseEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!arrangedTextareaRef.current) return;
        const { selectionStart, selectionEnd, value } = arrangedTextareaRef.current;
        
        if (selectionTimeoutRef.current) clearTimeout(selectionTimeoutRef.current);

        if (selectionStart !== selectionEnd) {
            const selectedText = value.substring(selectionStart, selectionEnd);
            let x = 0; let y = 0;
            if ('clientX' in e) {
                x = (e as React.MouseEvent).clientX;
                y = (e as React.MouseEvent).clientY;
            } else {
                const rect = arrangedTextareaRef.current.getBoundingClientRect();
                x = rect.left + rect.width / 2;
                y = rect.top + rect.height / 2;
            }
            const padding = 10; const popupWidth = 260; const popupHeight = 300;
            let finalX = x + 10; let finalY = y + 15;
            if (finalX + popupWidth > window.innerWidth - padding) finalX = window.innerWidth - popupWidth - padding;
            if (finalY + popupHeight > window.innerHeight - padding) finalY = window.innerHeight - popupHeight - padding;
            if (finalY < padding) finalY = padding;

            selectionTimeoutRef.current = setTimeout(() => {
                setPopupState({ visible: true, x: finalX, y: finalY, selectedText, startIndex: selectionStart, endIndex: selectionEnd });
                setSuggestOptions([]); setSuggestInput(""); setSuggestError("");
            }, 400);
        } else {
            setPopupState(null);
        }
  };`
);

// 2. Modify the Popup UI to be a compact tooltip
content = content.replace(
/            \{\/\* AI Suggestion Popup for Arrangement \*\/\}[\s\S]*?\{\/\* Dynamic Cover Artwork Background \*\/\}/,
`            {/* AI Suggestion Popup for Arrangement */}
            {popupState && popupState.visible && (
                <div 
                    ref={popupRef}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="fixed z-[100000] w-[260px] bg-[#1a1d24]/95 backdrop-blur-2xl border border-purple-500/40 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[350px] animate-in zoom-in-95 fade-in duration-200"
                    style={{ left: popupState.x, top: popupState.y }}
                >
                    <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/90 uppercase tracking-wider">
                            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                            AI Tùy Chỉnh Thẻ
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setPopupState(null); }}
                            className="p-1 hover:bg-white/10 rounded-md text-white/50 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="p-2.5 flex flex-col gap-2 shrink-0">
                        <div className="bg-black/40 rounded border border-white/5 p-1.5">
                            <div className="text-[8px] text-white/40 uppercase font-black mb-0.5">Đang chọn:</div>
                            <div className="text-[10px] text-white/80 font-medium break-words leading-tight line-clamp-2">"{popupState.selectedText}"</div>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 mt-1">
                            <input
                                type="text"
                                value={suggestInput}
                                onChange={(e) => setSuggestInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAskAITag()}
                                placeholder="Vd: 'chậm lại', 'giọng nam'..."
                                className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-purple-500/50"
                            />
                            <button
                                onClick={handleAskAITag}
                                disabled={!suggestInput.trim() || isSuggesting}
                                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[9px] font-bold uppercase tracking-widest py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                            >
                                {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                {isSuggesting ? "ĐANG TÌM..." : "GỢI Ý THẺ"}
                            </button>
                        </div>
                    </div>
                    {suggestError && (
                        <div className="px-2 pb-2 text-red-400 text-[10px] font-medium text-center shrink-0">
                            {suggestError}
                        </div>
                    )}
                    {suggestOptions.length > 0 && (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 pt-0 border-t border-white/10">
                            <div className="text-[9px] text-white/50 font-bold uppercase tracking-wider mb-1.5 mt-2">
                                Chọn để thay thế:
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {suggestOptions.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => { e.stopPropagation(); handleApplyAITag(opt.tag); }}
                                        className="text-left bg-white/5 hover:bg-purple-500/20 border border-white/5 hover:border-purple-500/40 rounded-lg p-2 transition-colors group"
                                    >
                                        <div className="font-mono text-[10px] text-purple-300 mb-0.5 group-hover:text-purple-200 font-bold">
                                            {opt.tag}
                                        </div>
                                        <div className="text-[9px] text-white/60 group-hover:text-white/80 leading-relaxed">
                                            {opt.explanation}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

       {/* Dynamic Cover Artwork Background */}`
);

fs.writeFileSync('src/components/StemStudio.tsx', content);
