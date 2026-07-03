const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
// To make it parse, remove the extra </div> at 5600!
code = code.replace('    </div>\n  );\n    </>\n}', '  );\n    </>\n}');
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});
traverse(ast, {
  JSXElement(path) {
    if (path.node.openingElement.name.name === 'div') {
      const startLine = path.node.openingElement.loc.start.line;
      const endLine = path.node.closingElement ? path.node.closingElement.loc.end.line : 'none';
      if (startLine === 3876 || startLine === 3923 || startLine === 3951) {
         console.log('DIV started at', startLine, 'closed at', endLine);
      }
    }
  }
});
