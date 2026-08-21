const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// I also need to reduce the text size of the options in the select just in case
code = code.replace(
  /className="bg-transparent text-white text-\[8\.5px\] sm:text-\[10px\] font-bold tracking-wider sm:tracking-widest uppercase px-1\.5 py-1\.5 sm:px-2 sm:py-2 rounded-r-lg outline-none cursor-pointer hover:bg-\[#008f5a\] transition-colors appearance-none text-center"/,
  'className="bg-transparent text-white text-[8.5px] sm:text-[9px] font-bold tracking-wider sm:tracking-widest uppercase px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-r-lg outline-none cursor-pointer hover:bg-[#008f5a] transition-colors appearance-none text-center"'
);

fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Patched stem frontend 3");
