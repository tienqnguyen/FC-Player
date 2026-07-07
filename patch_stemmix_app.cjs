const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();`;
const replacement1 = `        const response = await fetch(audioUrl);
        if (!response.ok) {
           throw new Error(\`Failed to fetch audio: \${response.statusText}\`);
        }
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
           throw new Error("Received JSON error instead of audio stream. Upstream might be blocked.");
        }
        const arrayBuffer = await response.arrayBuffer();`;
content = content.replace(target1, replacement1);

const target2 = `        const res = await fetch("/api/stemmix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioUrl })
        });
        const data = await res.json();`;

// Wait, I already changed target2 to handle blobs!
fs.writeFileSync('src/App.tsx', content);
