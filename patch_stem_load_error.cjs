const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

code = code.replace(/export default function StemStudio\(\{([^]+?)\}\: StemStudioProps\) \{/, 'export default function StemStudio({$1}: StemStudioProps) {');

code = code.replace(/catch\(err => \{\n                    console\.error\(\`Failed to fetch stem \$\{stem\}\:\`, err\);\n                \}\);/, `catch(err => {
                    console.error(\`Failed to fetch stem \$\{stem\}:\`, err);
                    if (typeof onStemLoadError === 'function') onStemLoadError(stem, err.message);
                });`);

code = code.replace(/audio\.addEventListener\('error', \(e\) => \{\n            console\.error\(\`Audio error for stem \$\{stem\}\:\`, audio\.error \? audio\.error\.code \+ " - " \+ audio\.error\.message \: "unknown error"\);\n        \}\);/, `audio.addEventListener('error', (e) => {
            const msg = audio.error ? audio.error.code + " - " + audio.error.message : "unknown error";
            console.error(\`Audio error for stem \$\{stem\}:\`, msg);
            if (typeof onStemLoadError === 'function') onStemLoadError(stem, "Media failed to decode: " + msg);
        });`);

fs.writeFileSync('src/components/StemStudio.tsx', code);
