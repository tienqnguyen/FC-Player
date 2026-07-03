const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf-8');

// The parent div of the EQ grid currently has "min-w-max"
code = code.replace('flex-1 w-full flex flex-col relative z-10 px-2 animate-in fade-in slide-in-from-right-4 duration-500 min-w-max', 'flex-1 w-full flex flex-col relative z-10 px-2 animate-in fade-in slide-in-from-right-4 duration-500');

fs.writeFileSync('src/components/StemStudio.tsx', code);
