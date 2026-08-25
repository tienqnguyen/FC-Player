const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace('import ProPhoiKhi from "./components/ProPhoiKhi";\n', '');
content = content.replace('if (window.location.search.includes("pro=1")) {\n    return <ProPhoiKhi />;\n  }\n', '');

fs.writeFileSync('src/App.tsx', content);
console.log('Removed ProPhoiKhi from App.tsx');
