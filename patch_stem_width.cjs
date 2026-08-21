const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

code = code.replace(
  /className=\{`flex flex-col items-center justify-center px-4 text-center w-full max-w-3xl sm:max-w-4xl mx-auto \$\{downloadLink \? 'py-4' : 'py-8 sm:py-12'\}`\}/g,
  "className={`flex flex-col items-center justify-center px-4 text-center w-full max-w-[95%] xl:max-w-[98%] mx-auto ${downloadLink ? 'py-4' : 'py-8 sm:py-12'}`}"
);

code = code.replace(
  /className="w-full max-w-4xl xl:max-w-5xl mt-6 sm:mt-12 flex flex-col gap-4 items-center bg-black\/20 p-3 sm:p-5 rounded-\[20px\] sm:rounded-3xl border border-white\/5 shadow-2xl"/g,
  'className="w-full max-w-[95%] xl:max-w-[98%] mt-6 sm:mt-12 flex flex-col gap-4 items-center bg-black/20 p-3 sm:p-5 rounded-[20px] sm:rounded-3xl border border-white/5 shadow-2xl mx-auto"'
);

fs.writeFileSync('src/components/StemStudio.tsx', code);
console.log("Patched");
