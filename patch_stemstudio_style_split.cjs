const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// 1. Add state
if (!code.includes('lyricArrangedStyle')) {
    code = code.replace('const [lyricArranged, setLyricArranged] = useState<string>("");', 'const [lyricArranged, setLyricArranged] = useState<string>("");\n  const [lyricArrangedStyle, setLyricArrangedStyle] = useState<string>("");');
}

// 2. Update handler
const oldHandler = `if (res.ok && data.lyric) {
           setLyricArranged(data.lyric);
        } else if (data.error) {`;
const newHandler = `if (res.ok && data.lyric) {
           setLyricArranged(data.lyric);
           setLyricArrangedStyle(data.style || "");
        } else if (data.error) {`;
code = code.replace(oldHandler, newHandler);

// Add reset to handler
const oldHandlerStart = `setIsArrangingLyric(true);
     setLyricArranged("Đang tạo bản phối khí chuyên nghiệp... (Thường mất khoảng 15-30 giây)");`;
const newHandlerStart = `setIsArrangingLyric(true);
     setLyricArranged("Đang tạo bản phối khí chuyên nghiệp... (Thường mất khoảng 15-30 giây)");
     setLyricArrangedStyle("");`;
code = code.replace(oldHandlerStart, newHandlerStart);

// 3. Update UI
const newResultUI = `{lyricArrangedStyle && (
                    <div className="flex flex-col gap-1 mt-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] text-white/50 font-bold uppercase tracking-wider flex justify-between items-end">
                            Style Prompt (Cho ô Style of Music)
                            <button className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 border border-amber-500/30 px-2 py-1 rounded-lg transition-colors" onClick={() => navigator.clipboard.writeText(lyricArrangedStyle)}>Copy Style</button>
                        </label>
                        <textarea 
                            className="w-full bg-black/60 border border-amber-500/30 rounded-xl p-3 text-amber-400 font-mono text-[11px] sm:text-[12px] leading-relaxed custom-scrollbar focus:outline-none focus:border-amber-500/70 min-h-[80px]"
                            value={lyricArrangedStyle}
                            readOnly
                        />
                    </div>
                )}
                {lyricArranged && (
                    <div className="flex flex-col gap-1 mt-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] text-white/50 font-bold uppercase tracking-wider flex justify-between items-end">
                            Kết quả phối khí (Cho ô Lyrics)
                            {!isArrangingLyric && <button className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/40 border border-purple-500/30 px-2 py-1 rounded-lg transition-colors" onClick={() => navigator.clipboard.writeText(lyricArranged)}>Copy Lyrics</button>}
                        </label>
                        <textarea 
                            className="w-full bg-black/60 border border-purple-500/30 rounded-xl p-3 text-emerald-400 font-mono text-[11px] sm:text-[12px] leading-relaxed custom-scrollbar focus:outline-none focus:border-purple-500/70 min-h-[300px]"
                            value={lyricArranged}
                            readOnly
                        />
                    </div>
                )}`;

// Fallback regex if formatting is slightly off
const regex = /\{lyricArranged && \(\s*<div className="flex flex-col gap-1 mt-2">[\s\S]*?<\/div>\s*\)\}/;
code = code.replace(regex, newResultUI);

fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Frontend patched for style split");
