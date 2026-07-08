const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. "Sound Only" -> "Sound"
code = code.replace(/<Music className="w-3 h-3" \/>\n\s*Sound Only/g, '<Music className="w-3 h-3" />\n                      Sound');

// 2. "TikTok Video" -> "Video"
code = code.replace(/<Film className="w-3 h-3" \/>\n\s*<span className="hidden sm:inline">TikTok <\/span>Video/g, '<Film className="w-3 h-3" />\n                      Video');

// 3. YouTube -> YT
code = code.replace(/<span className="hidden sm:inline">YouTube<\/span>/g, 'YouTube');

// 4. Audio (NCT) -> NCT
code = code.replace(/Audio <span className="hidden sm:inline">\(NCT\)<\/span>/g, 'NCT');

// 5. TKaraoke -> TK
code = code.replace(/<span className="hidden sm:inline">TKaraoke<\/span>/g, 'TKaraoke');

fs.writeFileSync('src/App.tsx', code);
console.log("Patched tab texts.");
