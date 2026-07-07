const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /setSeparationMode\("webgpu"\);\s*setTimeout\(\(\) => \{\s*const btn = document\.getElementById\("start-separation-btn"\);\s*if \(btn\) btn\.click\(\);\s*\}, 500\);/g;
const replace = `setSeparationMode("webgpu");
           setTimeout(() => {
              handleSeparateStems("webgpu");
           }, 100);`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Patched client fallback to call handleSeparateStems directly.");
} else {
  console.log("Could not find regex match.");
}
