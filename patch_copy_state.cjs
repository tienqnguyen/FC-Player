const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// 1. Add states
if (!code.includes('isArrangedStyleCopied')) {
    code = code.replace(
        'const [lyricArrangedStyle, setLyricArrangedStyle] = useState<string>("");',
        'const [lyricArrangedStyle, setLyricArrangedStyle] = useState<string>("");\n  const [isArrangedStyleCopied, setIsArrangedStyleCopied] = useState<boolean>(false);\n  const [isArrangedCopied, setIsArrangedCopied] = useState<boolean>(false);'
    );
}

// 2. Add copy handlers
const copyHandlers = `  const handleCopyArrangedStyle = async () => {
    try {
      await navigator.clipboard.writeText(lyricArrangedStyle);
      setIsArrangedStyleCopied(true);
      setTimeout(() => setIsArrangedStyleCopied(false), 2000);
    } catch (err) {}
  };

  const handleCopyArranged = async () => {
    try {
      await navigator.clipboard.writeText(lyricArranged);
      setIsArrangedCopied(true);
      setTimeout(() => setIsArrangedCopied(false), 2000);
    } catch (err) {}
  };
`;
if (!code.includes('handleCopyArrangedStyle')) {
    code = code.replace('const handleArrangeLyric = async () => {', copyHandlers + '\n  const handleArrangeLyric = async () => {');
}

// 3. Update UI - Style Button
const oldStyleBtn = `<button className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 border border-amber-500/30 px-2 py-1 rounded-lg transition-colors" onClick={() => navigator.clipboard.writeText(lyricArrangedStyle)}>Copy Style</button>`;
const newStyleBtn = `<button className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 border border-amber-500/30 px-2 py-1 rounded-lg transition-colors flex items-center gap-1.5" onClick={handleCopyArrangedStyle}>
                            {isArrangedStyleCopied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Style</>}
                        </button>`;
code = code.replace(oldStyleBtn, newStyleBtn);

// 4. Update UI - Lyric Button
const oldLyricBtn = `<button className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/40 border border-purple-500/30 px-2 py-1 rounded-lg transition-colors" onClick={() => navigator.clipboard.writeText(lyricArranged)}>Copy Lyrics</button>`;
const newLyricBtn = `<button className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/40 border border-purple-500/30 px-2 py-1 rounded-lg transition-colors flex items-center gap-1.5" onClick={handleCopyArranged}>
                            {isArrangedCopied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Lyrics</>}
                        </button>`;
code = code.replace(oldLyricBtn, newLyricBtn);

fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log('StemStudio patched for copy states.');
