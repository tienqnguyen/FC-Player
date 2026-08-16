const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix 2604
content = content.replace(
  'throw new Error(\`Failed to parse JSON from \${endpoint}. Response status: \${res.status}. Error: \${parseError.message}\`);',
  'throw new Error(\`Failed to parse JSON. Response status: \${res.status}. Error: \${parseError.message}\`);'
);

fs.writeFileSync('src/App.tsx', content);
console.log("Fixed App.tsx");
