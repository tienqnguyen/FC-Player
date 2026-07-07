const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/drums: result\.data\[2\]\?\.url \|\| null,/g, 'drums: result.data[2]?.url ? `/api/proxy-stream?url=${encodeURIComponent(result.data[2].url)}` : null,');
code = code.replace(/bass: result\.data\[3\]\?\.url \|\| null,/g, 'bass: result.data[3]?.url ? `/api/proxy-stream?url=${encodeURIComponent(result.data[3].url)}` : null,');
code = code.replace(/other: result\.data\[4\]\?\.url \|\| null,/g, 'other: result.data[4]?.url ? `/api/proxy-stream?url=${encodeURIComponent(result.data[4].url)}` : null,');
code = code.replace(/vocals: result\.data\[5\]\?\.url \|\| null,/g, 'vocals: result.data[5]?.url ? `/api/proxy-stream?url=${encodeURIComponent(result.data[5].url)}` : null,');
code = code.replace(/guitar: result\.data\[6\]\?\.url \|\| null,/g, 'guitar: result.data[6]?.url ? `/api/proxy-stream?url=${encodeURIComponent(result.data[6].url)}` : null,');
code = code.replace(/piano: result\.data\[7\]\?\.url \|\| null,/g, 'piano: result.data[7]?.url ? `/api/proxy-stream?url=${encodeURIComponent(result.data[7].url)}` : null,');

fs.writeFileSync('server.ts', code);
