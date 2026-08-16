const fs = require('fs');
const file = 'src/components/PixabayStudio.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'ADD PIXABAY SOUND',
  'ADD FREESOUND'
);

content = content.replace(
  'placeholder="Search Pixabay..."',
  'placeholder="Search Freesound..."'
);

fs.writeFileSync(file, content);
console.log("Renamed more PixabayStudio text");
