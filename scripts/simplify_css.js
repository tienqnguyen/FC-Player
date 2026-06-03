import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace expensive CSS filters to improve performance
content = content.replace(/backdrop-blur-(?:3xl|2xl|xl|lg|md|\[[^\]]+\])/g, 'backdrop-blur-sm');
content = content.replace(/blur-\[[^\]]+\]/g, 'blur-sm');
content = content.replace(/shadow-\[([^\]]+)\]/g, 'shadow-md');
content = content.replace(/mix-blend-screen/g, '');


fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Updated App.tsx with simplifications");
