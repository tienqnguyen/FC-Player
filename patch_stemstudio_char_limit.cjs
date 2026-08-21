const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// Add state
const newStates = `
  const [arrangeCharLimit, setArrangeCharLimit] = useState<boolean>(true);
  const [arrangeCustomPrompt, setArrangeCustomPrompt] = useState<string>("");
`;
if (!code.includes('arrangeCharLimit')) {
    code = code.replace('const [arrangeAddChords, setArrangeAddChords] = useState<boolean>(false);', 'const [arrangeAddChords, setArrangeAddChords] = useState<boolean>(false);\n' + newStates);
}

// Update handleArrangeLyric
const oldBody = `body: JSON.stringify({ lyric: text, options: { sunoFormat: arrangeSunoFormat, addChords: arrangeAddChords } })`;
const newBody = `body: JSON.stringify({ lyric: text, options: { sunoFormat: arrangeSunoFormat, addChords: arrangeAddChords, charLimit: arrangeCharLimit, customPrompt: arrangeCustomPrompt } })`;
code = code.replace(oldBody, newBody);

// Update UI
const uiToInsert = `
                   <label className="flex items-center gap-1.5 text-[10px] text-white/70 font-medium cursor-pointer hover:text-white transition-colors">
                      <input 
                         type="checkbox" 
                         checked={arrangeCharLimit} 
                         onChange={e => setArrangeCharLimit(e.target.checked)} 
                         className="w-3 h-3 bg-black/50 border-white/20 rounded accent-purple-500 cursor-pointer" 
                      />
                      Giới hạn dưới 5000 ký tự (Suno)
                   </label>
                </div>
                <div className="flex flex-col gap-1">
                   <label className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Custom Prompt (Optional)</label>
                   <input 
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white/90 text-sm focus:outline-none focus:border-amber-400/50"
                      value={arrangeCustomPrompt}
                      onChange={(e) => setArrangeCustomPrompt(e.target.value)}
                      placeholder="VD: Phối khí theo thể loại POP ballad nhẹ nhàng kèm tý adlib..."
                   />
                </div>
`;

if (!code.includes('Giới hạn dưới 5000')) {
    code = code.replace('Add Chords (Thêm hợp âm [Am], [C])\n                   </label>\n                </div>', 'Add Chords (Thêm hợp âm [Am], [C])\n                   </label>\n' + uiToInsert);
}

fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Patched StemStudio.tsx chars limit successfully.");
