const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const runSeparation = async \(\) => \{[\s\S]*?return null;\s*\};/;
const replace = `      const runSeparation = async () => {
        const promises = spaces.map(async (space) => {
          console.log(\`[Stemmix] Attempting to load Hugging Face Space: \${space}\`);
          const hfApp = await client(space);
          const res = await hfApp.predict("/separate_stems", {
            audio_file: handle_file(blob),
          });
          if (res && res.data) {
            console.log(\`[Stemmix] Successfully separated stems using Space: \${space}\`);
            return res;
          }
          throw new Error("No data");
        });
        
        try {
          return await Promise.any(promises);
        } catch (e) {
          console.warn(\`[Stemmix] All spaces failed.\`);
          return null;
        }
      };`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('server.ts', code);
  console.log("Patched runSeparation to be concurrent.");
} else {
  console.log("Could not find regex match.");
}
