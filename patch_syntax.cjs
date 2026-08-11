const fs = require('fs');
let content = fs.readFileSync('src/components/PixabayStudio.tsx', 'utf8');

content = content.replace(/e => e.key === 'Enter' && fetchSFX\(query, 1\); setPage\(1\);/g, "e => { if (e.key === 'Enter') { fetchSFX(query, 1); setPage(1); } }");

content = content.replace(/onClick=\{\(\) => fetchSFX\(query, 1\); setPage\(1\);\}/g, "onClick={() => { fetchSFX(query, 1); setPage(1); }}");

fs.writeFileSync('src/components/PixabayStudio.tsx', content);
