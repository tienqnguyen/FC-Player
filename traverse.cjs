const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// We know the parser fails! We can't parse it to an AST if there's a syntax error!
