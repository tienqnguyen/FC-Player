const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf-8');
const tags = [];
// This is a naive regex for JSX tags
const regex = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
let match;
while ((match = regex.exec(code)) !== null) {
  const tagContent = match[0];
  const tagName = match[1];
  const isClose = tagContent.startsWith('</');
  const isSelfClosing = tagContent.endsWith('/>');
  
  if (isSelfClosing) continue; // ignore self-closing tags
  
  if (isClose) {
    if (tags.length > 0 && tags[tags.length - 1] === tagName) {
      tags.pop();
    } else {
      console.log('Mismatch! Found closing', tagName, 'but expected', tags[tags.length - 1], 'at line', code.substring(0, match.index).split('\n').length);
      tags.pop(); // try to recover by popping anyway
    }
  } else {
    tags.push(tagName);
  }
}
console.log('Remaining open tags:', tags);
