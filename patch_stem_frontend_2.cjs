const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// find the hidden div and replace it with just the status if it exists
const hiddenDivRegex = /<div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-black\/40 border border-amber-500\/20 p-2 rounded-lg" style=\{\{ display: 'none' \}\}>\s*\{\/\* Removed OpenRouter key input since it uses server API \*\/\}\s*<\/div>/;
const replacementStatus = `
                           {aiBypassStatus && (
                               <div className="flex items-center gap-2 bg-black/40 border border-amber-500/20 p-2 rounded-lg">
                                   <span className="text-[9px] text-amber-400 font-medium">{aiBypassStatus}</span>
                               </div>
                           )}
`;

code = code.replace(hiddenDivRegex, replacementStatus);
fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Patched stem frontend 2");
