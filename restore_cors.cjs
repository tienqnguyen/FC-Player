const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

code = code.replace(/const audio = new Audio\(\);/, `const audio = new Audio();
        audio.crossOrigin = "anonymous";`);

fs.writeFileSync('src/components/StemStudio.tsx', code);
