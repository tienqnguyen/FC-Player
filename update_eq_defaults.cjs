const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf-8');

code = code.replace('{ name: "Air", f: 10000, q: 1.4, g: 0.0, type: "peaking", fRange: [8000, 12500] }', '{ name: "Air", f: 10000, q: 1.4, g: 7.8, type: "peaking", fRange: [8000, 12500] }');
code = code.replace('{ name: "Sparkle", f: 16000, q: 1.4, g: 0.0, type: "peaking", fRange: [12500, 20000] }', '{ name: "Sparkle", f: 16000, q: 1.4, g: 7.5, type: "peaking", fRange: [12500, 20000] }');

fs.writeFileSync('src/components/StemStudio.tsx', code);
