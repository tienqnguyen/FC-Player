const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');
let opened = 0;
let errors = [];
for (let i = 0; i < lines.length; i++) {
  const openCount = (lines[i].match(/\(/g) || []).length;
  const closeCount = (lines[i].match(/\)/g) || []).length;
  const openBrace = (lines[i].match(/\{/g) || []).length;
  const closeBrace = (lines[i].match(/\}/g) || []).length;
  
}
