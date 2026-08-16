const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/ba\[ext=m4a\]\/b\[ext=mp4\]\/ba\/b\/best/g, "ba/bestaudio/b/best");

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts yt-dlp args");
