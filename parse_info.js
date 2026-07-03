const fs = require('fs');
const data = JSON.parse(fs.readFileSync('info.json'));
console.log(JSON.stringify(data.named_endpoints['/separate_stems'], null, 2));
