const fs = require('fs');
let content = fs.readFileSync('src/components/PixabayStudio.tsx', 'utf8');
content = content.replace(/fetchSFX\(category, 1\); setPage\(1\);;/g, "fetchSFX(category, 1); setPage(1);");
fs.writeFileSync('src/components/PixabayStudio.tsx', content);
