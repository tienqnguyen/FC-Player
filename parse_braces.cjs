const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf-8');
let stack = [];
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
    } else if (code[i] === '{') {
      stack.push({ index: i, line: code.substring(0, i).split('\n').length });
    } else if (code[i] === '}') {
      if (stack.length > 0) stack.pop();
      else console.log('Extra } at line', code.substring(0, i).split('\n').length);
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
console.log('Unclosed braces at lines:');
stack.forEach(s => console.log(s.line, code.substring(s.index - 20, s.index + 20).replace(/\n/g, '\\n')));
