const fs = require('fs');
let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

const target1 = `          const resp = await fetch(url);
          const buf = await resp.arrayBuffer();`;
const replacement1 = `          const resp = await fetch(url);
          if (!resp.ok) throw new Error("Failed to fetch stem audio");
          const contentType = resp.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
             throw new Error("Received JSON instead of audio stream.");
          }
          const buf = await resp.arrayBuffer();`;
content = content.replace(target1, replacement1);

fs.writeFileSync('src/components/StemStudio.tsx', content);
