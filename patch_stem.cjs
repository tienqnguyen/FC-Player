const fs = require('fs');
const file = 'src/components/StemStudio.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'SEARCH PIXABAY</span>',
  'SEARCH FREESOUND</span>'
);

content = content.replace(
  "Search Pixabay for 'rain', 'forest', 'city'...",
  "Search Freesound for 'rain', 'forest', 'city'..."
);

content = content.replace(
  'Overlay Sound (Pixabay)</h3>',
  'Overlay Sound (Freesound)</h3>'
);

fs.writeFileSync(file, content);
console.log("Renamed StemStudio text");
