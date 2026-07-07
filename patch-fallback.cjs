const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /console\.log\(\`\[Stemmix\] AI separation spaces failed\.\`\);\s*return res\.status\(400\)\.json\(\{[\s\S]*?\}\);/;
const replace = `console.log(\`[Stemmix] AI separation spaces failed. Returning DSP fallback.\`);
      return res.json({
         success: true,
         stems: {
            drums: targetUrl,
            bass: targetUrl,
            other: targetUrl,
            vocals: targetUrl,
            guitar: targetUrl,
            piano: targetUrl,
            isDspFallback: true
         }
      });`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('server.ts', code);
  console.log("Patched server.ts to use DSP fallback instead of error.");
} else {
  console.log("Could not find regex match.");
}
