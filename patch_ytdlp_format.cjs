const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Change f: "ba[ext=m4a]/b[ext=mp4]/ba/b/best" to prioritize best audio
content = content.replace(
  /f: "ba\[ext=m4a\]\/b\[ext=mp4\]\/ba\/b\/best"/g,
  'f: "ba/bestaudio/b"'
);

content = content.replace(
  /f: "ba\[ext=m4a\]\/b\[ext=mp4\]\/ba\/b\/best"/g,
  'f: "ba/bestaudio/b"'
);

fs.writeFileSync('server.ts', content);
console.log("Patched yt-dlp format");
