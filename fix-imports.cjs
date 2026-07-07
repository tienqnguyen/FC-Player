const fs = require('fs');
let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');
content = content.replace(
  "import { Play, Pause",
  "import { Play, Pause, ChevronDown, ChevronRight"
);
fs.writeFileSync('src/components/StemStudio.tsx', content);
