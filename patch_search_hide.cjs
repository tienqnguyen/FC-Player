const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Hide the Sound button
content = content.replace(
  'onClick={() => {\n                        setTiktokSearchType("sound");',
  'onClick={() => {\n                        setTiktokSearchType("sound");'
);

// We can just add "hidden " to the className of these two buttons.
const buttonVideo = `onClick={() => {
                        setTiktokSearchType("video");`;
                        
const buttonSound = `onClick={() => {
                        setTiktokSearchType("sound");`;

// Actually let's use regex to hide them.
content = content.replace(
  /onClick=\{\(\) => \{\s*setTiktokSearchType\("sound"\);\s*if \(tiktokSearchQuery\.trim\(\)\) \{.*?\n\s*\}\}\n\s*className=\{\`/gs,
  (match) => match.replace('className={`', 'className={`hidden ')
);

content = content.replace(
  /onClick=\{\(\) => \{\s*setTiktokSearchType\("video"\);\s*if \(tiktokSearchQuery\.trim\(\)\) \{.*?\n\s*\}\}\n\s*className=\{\`/gs,
  (match) => match.replace('className={`', 'className={`hidden ')
);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched hide");
