const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/className={\`hidden text-\\[8px\\] sm:text-\\[9px\\] font-black tracking-wider uppercase px-1\\.5 py-1\\.5 rounded-lg transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center whitespace-nowrap \\$/g, 'className={`text-[8px] sm:text-[9px] font-black tracking-wider uppercase px-1.5 py-1.5 rounded-lg transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center whitespace-nowrap $');

fs.writeFileSync('src/App.tsx', content);
console.log("Patched tabs visibility");
