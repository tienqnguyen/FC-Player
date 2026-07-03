const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const startMainCol = code.indexOf('{/* Main Column */}');
// Let's find where StemStudio is.
const stemMobileStart = code.indexOf('{/* Stemmix Mobile Panel Ready */}');
const stemMobileEnd = code.indexOf('{(!isCompact || !showStemmix || stemmixStatus !== "ready") && (', stemMobileStart);

console.log(stemMobileStart, stemMobileEnd);
