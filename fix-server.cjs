const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Undo the targetUrl replace
code = code.replace(/let audioUrl = req\.body\.audioUrl;\n\s*let audioUrl = audioUrl;/g, 'let audioUrl = req.body.audioUrl;\n      let targetUrl = audioUrl;');
code = code.replace(/audioUrl = "uploaded_file";/g, 'targetUrl = "uploaded_file";');
code = code.replace(/if \(audioUrl\.includes\("\/api\/proxy-stream\?url="\)\) \{/g, 'if (targetUrl.includes("/api/proxy-stream?url=")) {');
code = code.replace(/audioUrl = decodeURIComponent\(audioUrl\.split\("url="\)\[1\]\);/g, 'targetUrl = decodeURIComponent(targetUrl.split("url=")[1]);');
code = code.replace(/else if \(audioUrl\.startsWith\("\/"\)\) \{/g, 'else if (targetUrl.startsWith("/")) {');
code = code.replace(/audioUrl = \`http:\/\/localhost:3000\$\{audioUrl\}\`;/g, 'targetUrl = `http://localhost:3000${targetUrl}`;');
code = code.replace(/console\.log\(\`\[Stemmix\] Fetching audio from: \$\{audioUrl\}\`\);/g, 'console.log(`[Stemmix] Fetching audio from: ${targetUrl}`);');
code = code.replace(/const audioResponse = await fetch\(audioUrl, \{ headers \}\);/g, 'const audioResponse = await fetch(targetUrl, { headers });');

fs.writeFileSync('server.ts', code);
