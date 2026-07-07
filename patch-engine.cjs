const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const activeEngine = forceEngine \|\| separationMode;/;
const replace = `const activeEngine = (typeof forceEngine === "string" ? forceEngine : null) || separationMode;`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Patched activeEngine assignment.");
} else {
  console.log("Could not find regex match.");
}
