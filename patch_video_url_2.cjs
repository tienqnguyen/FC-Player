const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'audioUrl: streamUrl,\n                                cover: song.cover',
  'audioUrl: streamUrl,\n                                videoUrl: streamUrl,\n                                cover: song.cover'
);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched videoUrl for youtube search results");
