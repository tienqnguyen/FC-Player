const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf-8');
let inString = false;
let stringChar = '';
let inComment = false;
let inBlockComment = false;
for (let i = 0; i < code.length; i++) {
  if (!inString && !inComment && !inBlockComment) {
    if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      inString = true;
      stringChar = code[i];
    } else if (code[i] === '/' && code[i+1] === '/') {
      inComment = true;
    } else if (code[i] === '/' && code[i+1] === '*') {
      inBlockComment = true;
    }
  } else if (inString) {
    if (code[i] === stringChar && code[i-1] !== '\\') {
      inString = false;
    }
  } else if (inComment) {
    if (code[i] === '\n') {
      inComment = false;
    }
  } else if (inBlockComment) {
    if (code[i] === '*' && code[i+1] === '/') {
      inBlockComment = false;
      i++;
    }
  }
}
console.log('inString:', inString, 'stringChar:', stringChar);
