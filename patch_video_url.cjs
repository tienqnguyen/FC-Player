const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// For shared tracks (YouTube, TikTok, Facebook), if they are video sources, set videoUrl
content = content.replace(
  'audioUrl: streamUrl,',
  'audioUrl: streamUrl,\n          videoUrl: (urlToUse.includes("tiktok.com") || urlToUse.includes("youtube.com") || urlToUse.includes("youtu.be") || urlToUse.includes("facebook.com") || urlToUse.includes("fb.watch")) ? streamUrl : null,'
);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched videoUrl for pasted links");
