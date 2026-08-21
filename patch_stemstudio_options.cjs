const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// 1. Add new state for the checkboxes
const newStates = `
  const [arrangeSunoFormat, setArrangeSunoFormat] = useState<boolean>(true);
  const [arrangeAddChords, setArrangeAddChords] = useState<boolean>(false);
`;
if (!code.includes('arrangeSunoFormat')) {
    code = code.replace('const [isArrangingLyric, setIsArrangingLyric] = useState<boolean>(false);', 'const [isArrangingLyric, setIsArrangingLyric] = useState<boolean>(false);\n' + newStates);
}

// 2. Update handleArrangeLyric to include options
const oldHandleArrange = `const handleArrangeLyric = async () => {
     const text = lyricArrangeInput || lyricRaw;
     if (!text) return;
     setIsArrangingLyric(true);
     setLyricArranged("Đang tạo bản phối khí chuyên nghiệp... (Thường mất khoảng 15-30 giây)");
     try {
        const res = await fetch("/api/lyric/arrange", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ lyric: text })
        });`;

const newHandleArrange = `const handleArrangeLyric = async () => {
     const text = lyricArrangeInput || lyricRaw;
     if (!text) return;
     setIsArrangingLyric(true);
     setLyricArranged("Đang tạo bản phối khí chuyên nghiệp... (Thường mất khoảng 15-30 giây)");
     try {
        const res = await fetch("/api/lyric/arrange", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ lyric: text, options: { sunoFormat: arrangeSunoFormat, addChords: arrangeAddChords } })
        });`;

if (code.includes('JSON.stringify({ lyric: text })')) {
    code = code.replace(oldHandleArrange, newHandleArrange);
} else {
    code = code.replace('body: JSON.stringify({ lyric: text })', 'body: JSON.stringify({ lyric: text, options: { sunoFormat: arrangeSunoFormat, addChords: arrangeAddChords } })');
}

// 3. Update UI to include options
const uiToInsert = `
                <div className="flex items-center gap-5 mt-1 mb-1">
                   <label className="flex items-center gap-1.5 text-[10px] text-white/70 font-medium cursor-pointer hover:text-white transition-colors">
                      <input 
                         type="checkbox" 
                         checked={arrangeSunoFormat} 
                         onChange={e => setArrangeSunoFormat(e.target.checked)} 
                         className="w-3 h-3 bg-black/50 border-white/20 rounded accent-purple-500 cursor-pointer" 
                      />
                      Suno Style Format (Thêm tag [INTRO], [piano] vào lời)
                   </label>
                   <label className="flex items-center gap-1.5 text-[10px] text-white/70 font-medium cursor-pointer hover:text-white transition-colors">
                      <input 
                         type="checkbox" 
                         checked={arrangeAddChords} 
                         onChange={e => setArrangeAddChords(e.target.checked)} 
                         className="w-3 h-3 bg-black/50 border-white/20 rounded accent-purple-500 cursor-pointer" 
                      />
                      Add Chords (Thêm hợp âm [Am], [C])
                   </label>
                </div>
                <button`;

code = code.replace('</label>\n                   <textarea', '</label>\n                   <textarea');
if (!code.includes('Suno Style Format (Thêm tag')) {
    code = code.replace('</div>\n                <button', '</div>' + uiToInsert);
}

fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Patched StemStudio.tsx options successfully.");
