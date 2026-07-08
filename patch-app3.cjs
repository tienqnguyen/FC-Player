const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The HTML for the tabs is around line 5580.
code = code.replace(/<span className="text-\[8px\] bg-red-500\/20 border border-red-500\/35 text-red-400 px-1 py-0\.2 rounded font-black">YT<\/span>\n\s*YouTube/, '<span className="text-[8px] bg-red-500/20 border border-red-500/35 text-red-400 px-1 py-0.2 rounded font-black">YT</span>\n                      <span className="hidden sm:inline">YouTube</span>');

code = code.replace(/<span className="text-\[8px\] bg-blue-500\/20 border border-blue-500\/35 text-blue-400 px-1 py-0\.2 rounded font-black">NCT<\/span>\n\s*NCT/, '<span className="text-[8px] bg-blue-500/20 border border-blue-500/35 text-blue-400 px-1 py-0.2 rounded font-black">NCT</span>\n                      <span className="hidden sm:inline">NCT</span>');

code = code.replace(/<span className="text-\[8px\] bg-purple-500\/20 border border-purple-500\/35 text-purple-400 px-1 py-0\.2 rounded font-black">TK<\/span>\n\s*TKaraoke/, '<span className="text-[8px] bg-purple-500/20 border border-purple-500/35 text-purple-400 px-1 py-0.2 rounded font-black">TK</span>\n                      <span className="hidden sm:inline">TKaraoke</span>');

fs.writeFileSync('src/App.tsx', code);
console.log("Patched tab texts 3.");
