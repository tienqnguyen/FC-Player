const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const idx = code.indexOf('{/* Stemmix Mobile Panel Ready */}');
const context = code.substring(Math.max(0, idx - 300), idx + 100);
console.log(context);
