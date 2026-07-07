const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/drums: audioUrl/g, 'drums: audioUrl');

fs.writeFileSync('server.ts', code);
