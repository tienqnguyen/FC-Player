import fs from 'fs';
let content = fs.readFileSync('src/audioPipeline.ts', 'utf-8');
content = content.replace(/oversample = '4x'/g, "oversample = 'none'");
fs.writeFileSync('src/audioPipeline.ts', content, 'utf-8');
console.log("Updated audioPipeline");
