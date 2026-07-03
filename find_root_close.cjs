const parser = require('@babel/parser');
const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
const lastIndex = code.lastIndexOf('    </div>\n  );\n}');
if (lastIndex !== -1) {
  code = code.substring(0, lastIndex) + '    // </div>\n  // );\n// }' + code.substring(lastIndex + 17);
}
try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log('Success with 1 less div!');
} catch (e) {
  console.log('Still error:', e.message, 'at line', e.loc ? e.loc.line : 'unknown');
}
