const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// 1. Add state variables
const stateToAdd = `
  const [isArrangingLyric, setIsArrangingLyric] = useState<boolean>(false);
  const [lyricArrangeInput, setLyricArrangeInput] = useState<string>("");
  const [lyricArranged, setLyricArranged] = useState<string>("");
`;
if (!code.includes('isArrangingLyric')) {
    code = code.replace('const [isFormattingLyric, setIsFormattingLyric] = useState<boolean>(false);', 'const [isFormattingLyric, setIsFormattingLyric] = useState<boolean>(false);\n' + stateToAdd);
}

// 2. Add handleArrangeLyric
const handleToAdd = `
  const handleArrangeLyric = async () => {
     const text = lyricArrangeInput || lyricRaw;
     if (!text) return;
     setIsArrangingLyric(true);
     setLyricArranged("Đang tạo bản phối khí chuyên nghiệp... (Thường mất khoảng 15-30 giây)");
     try {
        const res = await fetch("/api/lyric/arrange", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ lyric: text })
        });
        const data = await res.json();
        if (res.ok && data.lyric) {
           setLyricArranged(data.lyric);
        } else if (data.error) {
           setLyricArranged("Lỗi: " + data.error);
        }
     } catch (e: any) {
        setLyricArranged("Lỗi kết nối khi phối khí.");
     }
     setIsArrangingLyric(false);
  };
`;
if (!code.includes('handleArrangeLyric')) {
    code = code.replace('const handleFormatLyric = async () => {', handleToAdd + '\n  const handleFormatLyric = async () => {');
}

// 3. Add to expandedSections
if (code.includes('lyric: true') && !code.includes('arrange:')) {
    code = code.replace('lyric: true', 'lyric: true, arrange: false');
    code = code.replace('lyric: false', 'lyric: false, arrange: false');
}

// 4. Add phoiKhiLyricUI
const uiToAdd = `
  const phoiKhiLyricUI = (
    <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-1.5 cursor-pointer group" onClick={() => toggleSection('arrange')}>
            <h3 className="font-extrabold text-[9px] tracking-[0.15em] text-white/50 group-hover:text-white transition-colors uppercase"><Music className="w-3 h-3 inline-block mr-1 -mt-0.5" /> PHỐI KHÍ LYRIC</h3>
            <div className="flex items-center gap-2">
                {expandedSections.arrange ? <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />}
            </div>
        </div>
        {expandedSections.arrange && (
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Lyrics, Genre, Mood...</label>
                   <textarea 
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white/90 text-[16px] sm:text-sm leading-relaxed custom-scrollbar focus:outline-none focus:border-amber-400/50 min-h-[100px]"
                      value={lyricArrangeInput}
                      onChange={(e) => setLyricArrangeInput(e.target.value)}
                      placeholder="Enter lyrics, genre, mood, tempo here... (If empty, it will use the Raw Lyrics from SUNO Lyric Tool above)"
                   />
                </div>
                <button
                    onClick={handleArrangeLyric}
                    disabled={(!lyricArrangeInput && !lyricRaw) || isArrangingLyric}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm w-full"
                >
                    {isArrangingLyric ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Music className="w-3.5 h-3.5" />}
                    {isArrangingLyric ? "ĐANG PHỐI KHÍ..." : "TẠO BẢN PHỐI KHÍ CHUYÊN NGHIỆP"}
                </button>
                {lyricArranged && (
                    <div className="flex flex-col gap-1 mt-2">
                        <label className="text-[10px] text-white/50 font-bold uppercase tracking-wider flex justify-between">
                            Kết quả phối khí 
                            {lyricArranged && !isArrangingLyric && <button className="text-amber-400 hover:text-white" onClick={() => navigator.clipboard.writeText(lyricArranged)}>Copy</button>}
                        </label>
                        <textarea 
                            className="w-full bg-black/60 border border-purple-500/30 rounded-xl p-3 text-emerald-400 font-mono text-[11px] sm:text-[12px] leading-relaxed custom-scrollbar focus:outline-none focus:border-purple-500/70 min-h-[300px]"
                            value={lyricArranged}
                            readOnly
                        />
                    </div>
                )}
            </div>
        )}
    </div>
  );
`;
if (!code.includes('const phoiKhiLyricUI')) {
    code = code.replace('const sunoLyricUI = (', uiToAdd + '\n  const sunoLyricUI = (');
}

// 5. Inject `{phoiKhiLyricUI}` after `{sunoLyricUI}`
code = code.split('{sunoLyricUI}').join('{sunoLyricUI}\n                                 {phoiKhiLyricUI}');

fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Patched StemStudio.tsx successfully");
