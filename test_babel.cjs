const parser = require('@babel/parser');
const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf-8');
try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log('Success!');
} catch (e) {
  console.log(e.message, e.loc);
  const lines = code.split('\n');
  console.log('Error around:', lines[e.loc.line - 1]);
}
