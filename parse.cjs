const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf-8');
let open = 0;
const regex = /<\/?div[^>]*>/g;
let match;
while ((match = regex.exec(code)) !== null) {
  const line = code.substring(0, match.index).split('\n').length;
  if (match[0].startsWith('</')) {
    open--;
    console.log(line, 'close', open);
  } else if (!match[0].endsWith('/>')) {
    open++;
    console.log(line, 'open ', open);
  }
}
console.log('Final open count:', open);
