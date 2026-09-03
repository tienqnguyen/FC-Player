const fsSync = require('fs');
let content = fsSync.readFileSync('server.ts', 'utf-8');

content = content.replace(/fs\.unlink\(inputPathWithExt, \(\) => \{\}\);/g, "fs.unlink(inputPathWithExt).catch(() => {});");
content = content.replace(/fs\.unlink\(outputPath, \(\) => \{\}\);/g, "fs.unlink(outputPath).catch(() => {});");

fsSync.writeFileSync('server.ts', content);
