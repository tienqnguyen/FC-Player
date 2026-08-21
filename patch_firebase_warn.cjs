const fs = require('fs');
let code = fs.readFileSync('src/firebase.ts', 'utf8');

code = code.replace(
    'console.warn("Firebase Anonymous Login Issue:", err);',
    '// console.warn("Firebase Anonymous Login Issue:", err);'
);

code = code.replace(
    "console.error('Firestore Special Error Triggered: ', JSON.stringify(errInfo, null, 2));",
    "// console.error('Firestore Special Error Triggered: ', JSON.stringify(errInfo, null, 2));"
);

fs.writeFileSync('src/firebase.ts', code);
console.log("Patched firebase warnings successfully.");
