const parser = require('@babel/parser');
const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const lines = code.split('\n');
lines[3874] = '    <>'; // replace root div

const lastIndex = lines.lastIndexOf('  );');
if (lastIndex !== -1) {
  lines[lastIndex - 2] = '    </>'; // replace last div
}

try {
  parser.parse(lines.join('\n'), {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log('Success with fragment wrapper!');
} catch (e) {
  console.log('Error with fragment wrapper:', e.message, 'at line', e.loc ? e.loc.line : 'unknown');
}
