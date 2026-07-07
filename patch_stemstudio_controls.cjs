const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

code = code.replace(/<div className="flex-1 flex flex-col justify-center">/, `<div className="flex-1 flex flex-col justify-center">
                  <audio controls src={(stemUrls as any)[stem]} className="h-6 w-32" />`);

fs.writeFileSync('src/components/StemStudio.tsx', code);
