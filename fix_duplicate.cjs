const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// The original handleExportMix was around line 749.
// We can just remove the old handleExportMix completely by matching it.
// The old handleExportMix starts with `const handleExportMix = async (format: "wav" | "mp3" = "wav") => {`
// And ends at `};` before `return () => window.removeEventListener('resize', handleResize);`? No, before `useEffect(() => { ... resize ...`.

const oldExportStart = code.indexOf('const handleExportMix = async (format: "wav" | "mp3" = "wav") => {');
if (oldExportStart !== -1) {
    let braceCount = 0;
    let foundBrace = false;
    let oldExportEnd = -1;
    for (let i = oldExportStart; i < code.length; i++) {
        if (code[i] === '{') {
            braceCount++;
            foundBrace = true;
        } else if (code[i] === '}') {
            braceCount--;
        }
        if (foundBrace && braceCount === 0) {
            oldExportEnd = i + 1;
            break;
        }
    }
    if (oldExportEnd !== -1) {
        // Also remove any trailing semicolons or spaces
        while(code[oldExportEnd] === ';' || code[oldExportEnd] === '\n') {
           oldExportEnd++;
        }
        code = code.slice(0, oldExportStart) + code.slice(oldExportEnd);
    }
}

fs.writeFileSync('src/components/StemStudio.tsx', code);
