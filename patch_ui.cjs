const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const \[tiktokSearchType, setTiktokSearchType\] = useState<"sound" | "video" | "youtube" | "nhaccuatui" | "tkaraoke">\("sound"\);/,
  'const [tiktokSearchType, setTiktokSearchType] = useState<"sound" | "video" | "youtube" | "nhaccuatui" | "tkaraoke">("youtube");'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched default search type");
