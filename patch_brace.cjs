const fs = require('fs');
let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

content = content.replace(/      if \(ambientBuffer\) \{/, `      }
      if (ambientBuffer) {`);

fs.writeFileSync('src/components/StemStudio.tsx', content);
