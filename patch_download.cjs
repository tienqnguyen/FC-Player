const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Replace the url parsing block in /api/download
const targetStr = `      let finalUrl = url;
      if (!url.startsWith("http")) {
        finalUrl = \`http://localhost:3000\${url}\`;
      }`;

const replacementStr = `      let finalUrl = url;
      if (url.includes("/api/proxy-stream?url=")) {
        const urlParams = new URLSearchParams(url.split("?")[1]);
        finalUrl = urlParams.get("url") || url;
      } else if (url.includes("/api/stream?url=")) {
        const urlParams = new URLSearchParams(url.split("?")[1]);
        finalUrl = urlParams.get("url") || url;
      }
      
      if (!finalUrl.startsWith("http")) {
        finalUrl = \`http://localhost:3000\${finalUrl}\`;
      }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('server.ts', content);
console.log("Patched download url extraction");
