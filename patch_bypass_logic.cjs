const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const targetLogic = `    const processedLines = lines.map(line => {
      // Don't modify pure tag lines if protect is on
      if (protectTags && /^\\[.*?\\]$/.test(line.trim())) return line;
      
      const words = line.split(/(\\s+)/); // Preserve whitespace
      return words.map(w => {
         if (w.trim() === '') return w;
         return applyBypassToWord(w);
      }).join('');
    });`;

const newLogic = `    const processedLines = lines.map(line => {
      // Don't modify pure tag lines if protect is on
      if (protectTags && /^\\[.*?\\]$/.test(line.trim())) return line;
      
      const words = line.split(/(\\s+)/); // Preserve whitespace
      return words.map(w => {
         if (w.trim() === '') {
             if (bypassMethod === 'underscore' && w.length > 0) {
                 if (Math.random() <= intensityProb) {
                     return w.replace(/ /g, '_');
                 }
             }
             return w;
         }
         return applyBypassToWord(w);
      }).join('');
    });`;

if (code.includes('if (w.trim() === \'\') return w;')) {
    code = code.replace(targetLogic, newLogic);
    fs.writeFileSync('src/components/StemStudio.tsx', code);
    console.log("Patched bypass logic.");
} else {
    console.log("Target logic not found.");
}
