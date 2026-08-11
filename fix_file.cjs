const fs = require('fs');
let content = fs.readFileSync('src/components/PixabayStudio.tsx', 'utf8');

content = content.replace(/import TimelineScrubber from '\.\/TimelineScrubber';\nimport TimelineScrubber from '\.\/TimelineScrubber';\nimport TimelineScrubber from '\.\/TimelineScrubber';/g, "import TimelineScrubber from './TimelineScrubber';");
content = content.replace(/  masterDuration\?: number;\n  masterDuration\?: number;\n  masterDuration\?: number;/g, "  masterDuration?: number;");
content = content.replace(/  React\.useImperativeHandle\(ref, \(\) => \(\{ getTracks: \(\) => tracks \}\), \[tracks\]\);\n  React\.useImperativeHandle\(ref, \(\) => \(\{ getTracks: \(\) => tracks \}\), \[tracks\]\);\n  React\.useImperativeHandle\(ref, \(\) => \(\{ getTracks: \(\) => tracks \}\), \[tracks\]\);/g, "  React.useImperativeHandle(ref, () => ({ getTracks: () => tracks }), [tracks]);");

fs.writeFileSync('src/components/PixabayStudio.tsx', content);
