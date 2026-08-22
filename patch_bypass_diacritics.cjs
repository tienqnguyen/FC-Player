const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// 1. Patch State
const targetState = 'const [bypassMethod, setBypassMethod] = useState<"hyphen" | "zerowidth" | "homoglyph" | "alternating" | "extreme" | "underscore" | "none">("none");';
const newState = 'const [bypassMethod, setBypassMethod] = useState<"hyphen" | "zerowidth" | "homoglyph" | "alternating" | "extreme" | "underscore" | "diacritics" | "none">("none");';
code = code.replace(targetState, newState);

// 2. Patch Logic
const targetLogic = `      if (bypassMethod === 'homoglyph') {
        const chars = word.split('');
        for (let i = 0; i < chars.length; i++) {
           const char = chars[i];
           if (homoglyphMap[char] && Math.random() < 0.5) {
              chars[i] = homoglyphMap[char][Math.floor(Math.random() * homoglyphMap[char].length)];
           }
        }
        return chars.join('');
      }`;
const newLogic = `      if (bypassMethod === 'homoglyph') {
        const chars = word.split('');
        for (let i = 0; i < chars.length; i++) {
           const char = chars[i];
           if (homoglyphMap[char] && Math.random() < 0.5) {
              chars[i] = homoglyphMap[char][Math.floor(Math.random() * homoglyphMap[char].length)];
           }
        }
        return chars.join('');
      }

      if (bypassMethod === 'diacritics') {
        let decomposed = word.normalize('NFD');
        let newStr = '';
        for (let i = 0; i < decomposed.length; i++) {
           if (decomposed[i] === '\\u0309') newStr += '\\u0303'; // hỏi -> ngã
           else if (decomposed[i] === '\\u0303') newStr += '\\u0309'; // ngã -> hỏi
           else newStr += decomposed[i];
        }
        return newStr.normalize('NFC');
      }`;
code = code.replace(targetLogic, newLogic);

// 3. Patch UI
const targetUI = `                           {/* Button 6 - Pro / Extreme */}
                           <button onClick={() => setBypassMethod("extreme")} className={\`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left sm:col-span-2 \${bypassMethod === 'extreme' ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-black/60 border-red-500/20 text-white/70 hover:bg-red-500/10'}\`}>`;

const newUI = `                           {/* Button 6 - Diacritics (Ngã/Hỏi) */}
                           <button onClick={() => setBypassMethod("diacritics")} className={\`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left \${bypassMethod === 'diacritics' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-black/60 border-white/5 text-white/70 hover:bg-white/5'}\`}>
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[11px] font-bold text-white">Đảo dấu (Ngã ↔ Hỏi)</span>
                                <span className="flex items-center text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">SUNO ★★★★</span>
                              </div>
                              <span className="text-[9px] opacity-70 leading-relaxed text-white/60">Đổi "vẫn" thành "vẩn", "giữa" thành "giửa". Đánh lừa filter tốt và Suno vẫn hát khá giống.</span>
                           </button>
                           {/* Button 7 - Pro / Extreme */}
                           <button onClick={() => setBypassMethod("extreme")} className={\`p-3 border rounded-xl flex flex-col items-start gap-1.5 transition-all text-left sm:col-span-2 \${bypassMethod === 'extreme' ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-black/60 border-red-500/20 text-white/70 hover:bg-red-500/10'}\`}>`;

code = code.replace(targetUI, newUI);

fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Patched successfully.");
