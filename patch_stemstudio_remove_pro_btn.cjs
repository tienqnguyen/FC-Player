const fs = require('fs');
let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

content = content.replace(
    /<button\n\s*onClick=\{\(e\) => \{ e\.stopPropagation\(\); window\.open\('\?pro=1', '_blank'\); \}\}\n\s*className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-2 py-0\.5 rounded uppercase text-\[8px\] font-black tracking-widest shadow-md transition-all active:scale-95"\n\s*title="Mở phiên bản PRO trong tab mới"\n\s*>\n\s*<Sparkles className="w-2\.5 h-2\.5" \/>\n\s*PRO\n\s*<\/button>/g,
    ''
);

fs.writeFileSync('src/components/StemStudio.tsx', content);
console.log('Removed PRO button from StemStudio.tsx');
