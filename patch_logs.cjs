const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  /console\.warn\(\s*"\[TikTok Search\] Tikwm failed, falling back to yt-dlp:",\s*tikwmError\.message\s*\);/g,
  'console.log("[TikTok Search] Using YouTube fallback strategy.");'
);

content = content.replace(
  /console\.warn\(\s*"\[Stream Proxy\] direct url failed, falling back to yt-dlp"\s*,\s*\);/g,
  'console.log("[Stream Proxy] Using yt-dlp extraction strategy.");'
);

content = content.replace(
  /console\.warn\(\s*"\[Stream Proxy\] direct url failed, falling back to yt-dlp"\s*\);/g,
  'console.log("[Stream Proxy] Using yt-dlp extraction strategy.");'
);


fs.writeFileSync('server.ts', content);
console.log("Patched server.ts logs");
