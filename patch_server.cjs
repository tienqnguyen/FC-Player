const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'arrangeLyric,',
  'arrangeLyric,\n  suggestLyricTags,'
);

content = content.replace(
  'const { suggestLyricTags } = require("./server/lyricProcessor");',
  ''
);

fs.writeFileSync('server.ts', content);
console.log('Patched server.ts');
