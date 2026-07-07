const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// 1. Add preservePitch state
if (!code.includes('const [preservePitch')) {
  code = code.replace(
    /const \[speed, setSpeed\] = useState<number>\(1\);/,
    `const [speed, setSpeed] = useState<number>(1);
  const [preservePitch, setPreservePitch] = useState<boolean>(true);`
  );
}

// 2. Update the speed effect to use preservePitch
code = code.replace(
  /if \('preservesPitch' in audio\) \{\s*\(audio as any\)\.preservesPitch = true;\s*\}/,
  `if ('preservesPitch' in audio) {
            (audio as any).preservesPitch = preservePitch;
         }`
);
code = code.replace(/\[speed, stemsList\]/, `[speed, preservePitch, stemsList]`);

// 3. Add UI for Pitch Shift
const fxUIRegex = /<span className="text-\[10px\] font-black uppercase tracking-wider text-amber-400">Tempo \/ Speed<\/span>\s*<span className="text-\[10px\] font-mono text-white\/70">\{speed\.toFixed\(2\)\}x<\/span>\s*<\/div>\s*<input\s*type="range" min="0\.5" max="2" step="0\.05" value=\{speed\}\s*onChange=\{\(e\) => setSpeed\(parseFloat\(e\.target\.value\)\)\}\s*className="w-full h-1\.5 rounded-lg appearance-none bg-white\/10 accent-amber-400"\s*\/>/;
const fxUIReplace = `<div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Tempo / Speed</span>
                         <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={preservePitch} onChange={(e) => setPreservePitch(e.target.checked)} className="accent-amber-400" />
                            <span className="text-[9px] font-bold text-white/50 uppercase">Keep Pitch</span>
                         </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-white/70 w-8">{speed.toFixed(2)}x</span>
                        <input
                            type="range" min="0.5" max="2" step="0.05" value={speed}
                            onChange={(e) => setSpeed(parseFloat(e.target.value))}
                            className="flex-1 h-1.5 rounded-lg appearance-none bg-white/10 accent-amber-400"
                        />
                      </div>`;
code = code.replace(fxUIRegex, fxUIReplace);

fs.writeFileSync('src/components/StemStudio.tsx', code);
