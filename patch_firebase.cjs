const fs = require('fs');
let code = fs.readFileSync('src/firebase.ts', 'utf8');

code = code.replace(
    "throw new Error(JSON.stringify(errInfo));",
    "// throw new Error(JSON.stringify(errInfo)); // Disabling throw to prevent app crashes when Firebase is not setup properly\n  console.warn('Firebase functionality is limited due to the above error.');"
);

fs.writeFileSync('src/firebase.ts', code);
console.log("Patched firebase.ts successfully.");
