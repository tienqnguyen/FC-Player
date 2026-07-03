const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace('{isCompact && showStemmix && stemmixStatus === "ready" && stemUrls && (', '{showStemmix && stemmixStatus === "ready" && stemUrls && (');
code = code.replace('h-[50dvh] bg-[#0A0A0C]/95 backdrop-blur-xl rounded-[24px]', '${isCompact ? \'h-[50dvh]\' : \'h-[600px] mb-4\'} bg-[#0A0A0C]/95 backdrop-blur-xl rounded-[24px]');
code = code.replace('isCompactUI={true}', 'isCompactUI={isCompact}');
code = code.replace('className="w-full mt-2 flex flex-col ${isCompact', 'className={`w-full mt-2 flex flex-col ${isCompact');
code = code.replace('fade-in z-50 overflow-hidden">', 'fade-in z-50 overflow-hidden`}>');

fs.writeFileSync('src/App.tsx', code);
