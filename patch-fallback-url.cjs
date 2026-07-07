const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /isDspFallback:\s*true/g;

if (regex.test(code)) {
  code = code.replace(/targetUrl/g, 'audioUrl');
  fs.writeFileSync('server.ts', code);
  console.log("Patched server.ts to use audioUrl instead of targetUrl.");
} else {
  console.log("Could not find regex match.");
}
