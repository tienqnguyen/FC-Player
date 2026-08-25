const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
/onPlay=\{\(\) => \{ setIsPlaying\(true\); setConsecutiveFailures\(0\); \}\}/g,
`onPlay={() => setIsPlaying(true)}
          onPlaying={() => setConsecutiveFailures(0)}`
);

fs.writeFileSync('src/App.tsx', content);
