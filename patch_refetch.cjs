const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
/const streamUrl = `\/api\/stream\?url=\$\{encodeURIComponent\(currentSong\.originalUrl\)\}\&_t=\$\{Date\.now\(\)\}`;/,
`const streamUrl = \`/api/stream?url=\${encodeURIComponent(currentSong.originalUrl)}&force_refresh=true&_t=\${Date.now()}\`;`
);

fs.writeFileSync('src/App.tsx', content);
