const fs = require('fs');
let code = fs.readFileSync('server/lyricProcessor.ts', 'utf8');

const oldReturn = `text = text.replace(/\\\`\\\`\\\`json/g, '').replace(/\\\`\\\`\\\`/g, '').trim();
            return { lyric: text };`;
            
const newReturn = `text = text.replace(/\\\`\\\`\\\`json/g, '').replace(/\\\`\\\`\\\`/g, '').trim();
            
            let style = "";
            let lyric = text;
            
            const styleMatch = text.match(/(?:STYLE|SUNO STYLE PROMPT):\\s*(.*?)(?:\\n\\n|\\r\\n\\r\\n)/s);
            if (styleMatch) {
                style = styleMatch[1].trim();
                lyric = text.replace(styleMatch[0], "").trim();
            } else {
                const fallbackMatch = text.match(/(?:STYLE|SUNO STYLE PROMPT):\\s*(.*)$/ism);
                if (fallbackMatch && fallbackMatch[1].length < 1000) {
                     style = fallbackMatch[1].trim();
                     lyric = text.replace(fallbackMatch[0], "").trim();
                }
            }
            
            return { lyric: lyric, style: style };`;

code = code.replace(oldReturn, newReturn);
fs.writeFileSync('server/lyricProcessor.ts', code);
console.log("Backend patched for style split");
