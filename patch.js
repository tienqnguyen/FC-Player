const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');
code = code.replace("import App from './App.tsx';", "import App from './App.tsx';\nconsole.error('APP STARTED');");
fs.writeFileSync('src/main.tsx', code);
