const fs = require('fs');
let content = fs.readFileSync('src/components/SunoLyricDownloader.tsx', 'utf-8');

const snippetRegex = /const SNIPPET = "(.*?)";/;
const match = content.match(snippetRegex);
if(match) {
  let raw = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, "\\");
  fs.writeFileSync('/tmp/raw.js', raw);
  console.log("Wrote raw snippet");
}
