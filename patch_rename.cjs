const fs = require('fs');
const file = 'src/components/PixabayStudio.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'Pixabay Search</h4>',
  'Freesound search</h4>'
);

content = content.replace(
  'Favorites (${favorites.length})',
  'Favorites ({favorites.length})'
);

fs.writeFileSync(file, content);
console.log("Renamed PixabayStudio text");
