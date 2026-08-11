const fs = require('fs');
let content = fs.readFileSync('src/components/PixabayStudio.tsx', 'utf8');

content = content.replace(/url\.match\(\/-\(d\+\)\/\?\$(\/)\)/, "url.match(/-(\\\\d+)\\\\/?$/)");

fs.writeFileSync('src/components/PixabayStudio.tsx', content);
