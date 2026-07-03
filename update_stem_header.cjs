const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf-8');

const target = `{isEmbedded && (
                  <div className="text-[12px] uppercase tracking-widest font-black text-white/80">
                      Stem Studio
                  </div>
              )}`;

const replacement = `{isEmbedded && (
                  <div className="flex items-center justify-between w-full">
                      <div className="text-[12px] uppercase tracking-widest font-black text-white/80 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M12 2v20"/></svg>
                          Stem Studio
                      </div>
                      <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                  </div>
              )}`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/components/StemStudio.tsx', code);
    console.log("Updated StemStudio header");
} else {
    console.log("Could not find target in StemStudio.tsx");
}
