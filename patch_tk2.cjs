const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /console\.warn\(`\[TikTok Search\] yt-dlp search query failed.*?\);/,
  'console.warn(`[TikTok Search] yt-dlp query failed for mapped user url`);'
);

fs.writeFileSync('server.ts', code);
console.log("Patched warning");
