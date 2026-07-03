const fs = require('fs');
const code = fs.readFileSync('player_section.txt', 'utf-8');
let open = 0;
let tags = [];
const regex = /<\/?div[^>]*>/g;
let match;
while ((match = regex.exec(code)) !== null) {
  if (match[0].startsWith('</')) {
    open--;
    tags.push({ type: 'close', openCount: open, str: match[0], index: match.index });
  } else if (!match[0].endsWith('/>')) {
    open++;
    tags.push({ type: 'open', openCount: open, str: match[0], index: match.index });
  }
}
console.log('Final open count:', open);
