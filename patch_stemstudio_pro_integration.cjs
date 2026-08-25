const fs = require('fs');
let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// Add Wand2 if missing
if (!content.includes('Wand2,')) {
    content = content.replace('import { ', 'import { Wand2, X, ');
}

// Add state for AI suggestions
const stateCode = `
  const arrangedTextareaRef = useRef<HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const [popupState, setPopupState] = useState<{
        visible: boolean;
        x: number;
        y: number;
        selectedText: string;
        startIndex: number;
        endIndex: number;
  } | null>(null);

  const [suggestInput, setSuggestInput] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestOptions, setSuggestOptions] = useState<Array<{tag: string, explanation: string}>>([]);
  const [suggestError, setSuggestError] = useState("");

  const handleSelectArranged = (e: React.MouseEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!arrangedTextareaRef.current) return;
        const { selectionStart, selectionEnd, value } = arrangedTextareaRef.current;
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
            const padding = 20; const popupWidth = 350; const popupHeight = 400;
            let finalX = x + 15; let finalY = y + 15;
            if (finalX + popupWidth > window.innerWidth - padding) finalX = window.innerWidth - popupWidth - padding;
            if (finalY + popupHeight > window.innerHeight - padding) finalY = window.innerHeight - popupHeight - padding;
            if (finalY < padding) finalY = padding;

            setPopupState({ visible: true, x: finalX, y: finalY, selectedText, startIndex: selectionStart, endIndex: selectionEnd });
            setSuggestOptions([]); setSuggestInput(""); setSuggestError("");
        }
  };

  useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                popupRef.current && 
                !popupRef.current.contains(e.target as Node) &&
                arrangedTextareaRef.current && 
                !arrangedTextareaRef.current.contains(e.target as Node)
            ) {
                setPopupState(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAskAITag = async () => {
        if (!popupState || !suggestInput.trim()) return;
        setIsSuggesting(true); setSuggestError("");
        try {
            const res = await fetch("/api/lyric/suggest", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ selectedText: popupState.selectedText, instruction: suggestInput })
            });
            const data = await res.json();
            if (res.ok && data.options) { setSuggestOptions(data.options); }
            else { setSuggestError(data.error || "Lỗi tạo gợi ý."); }
        } catch (e: any) { setSuggestError("Lỗi kết nối máy chủ."); }
        setIsSuggesting(false);
  };

  const handleApplyAITag = (tag: string) => {
        if (!popupState || !arrangedTextareaRef.current) return;
        const before = lyricArranged.substring(0, popupState.startIndex);
        const after = lyricArranged.substring(popupState.endIndex);
        const newText = before + tag + after;
        setLyricArranged(newText);
        setPopupState(null);
        setTimeout(() => {
            if (arrangedTextareaRef.current) {
                arrangedTextareaRef.current.focus();
                const newPos = before.length + tag.length;
                arrangedTextareaRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
  };
`;

if (!content.includes('const handleSelectArranged')) {
    content = content.replace(
        'const [lyricArrangedStyle, setLyricArrangedStyle] = useState<string>("");',
        'const [lyricArrangedStyle, setLyricArrangedStyle] = useState<string>("");\n' + stateCode
    );
}

// Modify textarea
content = content.replace(
    /value=\{lyricArranged\}\n\s+readOnly/g,
    `ref={arrangedTextareaRef}
                            value={lyricArranged}
                            onChange={(e) => setLyricArranged(e.target.value)}
                            onMouseUp={handleSelectArranged}
                            onKeyUp={handleSelectArranged}
                            placeholder="Kịch bản phối khí (Bạn có thể sửa trực tiếp hoặc bôi đen chữ để AI gợi ý)"`
);

// Add popup UI before returning JSX
const popupUI = `
            {/* AI Suggestion Popup for Arrangement */}
            {popupState && popupState.visible && (
                <div 
                    ref={popupRef}
                    style={{ left: popupState.x, top: popupState.y, position: 'fixed', zIndex: 9999 }}
                    className="w-80 bg-[#1a1d24] border border-purple-500/30 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[60vh] animate-in zoom-in-95 duration-200"
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
            )}
`;

if (!content.includes('AI Suggestion Popup for Arrangement')) {
    content = content.replace(
        '{/* Dynamic Cover Artwork Background */}',
        popupUI + '\n       {/* Dynamic Cover Artwork Background */}'
    );
}

fs.writeFileSync('src/components/StemStudio.tsx', content);
console.log('Patched StemStudio.tsx');
