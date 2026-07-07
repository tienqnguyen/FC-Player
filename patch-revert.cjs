const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /console\.log\(\`\[Stemmix\] AI separation spaces not available\. Using local DSP fallback\.\`\);\s*return res\.json\(\{\s*success:\s*true,\s*stems:\s*\{[\s\S]*?\}\s*\}\);/;
const replace = `console.log(\`[Stemmix] AI separation spaces failed.\`);
      return res.status(400).json({ 
        success: false, 
        error: "AI Cloud servers are currently overloaded or offline. Please select the ⚡ WebGPU mode to process it locally." 
      });`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('server.ts', code);
  console.log("Reverted server.ts to return error instead of DSP fallback.");
} else {
  console.log("Could not find regex match.");
}
