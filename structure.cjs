const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const sections = [
    '{/* Main Single Page Layout Container */}',
    '{/* Main Column */}',
    '{/* Player Section */}',
    '{/* Stemmix Panel Loading/Error */}',
    '{/* Stemmix Mobile Panel Ready */}',
    '{(!isCompact || !showStemmix || stemmixStatus !== "ready") && (',
    '{/* Right Sidebar / Column 2 (Desktop) */}',
];

sections.forEach(s => console.log(code.indexOf(s) > -1 ? "FOUND: " + s : "NOT FOUND: " + s));
