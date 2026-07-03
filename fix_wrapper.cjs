const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');

lines.splice(3874, 0, '    <>');
lines.splice(5601, 0, '    </>');

fs.writeFileSync('src/App.tsx', lines.join('\n'));
