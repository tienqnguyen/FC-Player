const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'const data = await res.json();',
  `let data;
      try {
        data = await res.json();
      } catch (parseError: any) {
        throw new Error(\`Failed to parse JSON from \${endpoint}. Response status: \${res.status}. Error: \${parseError.message}\`);
      }`
);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched error message");
