const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the second occurrence of res.json()
content = content.replace(
  'const data = await res.json();\n      const results = data.videos || [];',
  `let data;\n      try { data = await res.json(); } catch(e:any) { throw new Error(\`Failed parsing from \${endpoint}: \${e.message}\`); }\n      const results = data.videos || [];`
);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched 2nd res.json");
