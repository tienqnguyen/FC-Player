const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

const target = `      const url = \`https://cdn1.suno.ai/\${sunoId}.m4a\`;
      const inputPathWithExt = \`/tmp/\${sunoId}_\${Date.now()}.m4a\`;
      const outputPath = \`/tmp/\${sunoId}_\${Date.now()}.mp3\`;

      const fetchRes = await fetch(url);
      if (!fetchRes.ok) {
        return res.status(400).json({ error: \`Failed to download audio from Suno: \${fetchRes.statusText}\` });
      }`;

const replacement = `      const urlsToTry = [
        \`https://cdn1.suno.ai/\${sunoId}.mp4\`,
        \`https://d2lwuy8qc234o3.cloudfront.net/1/clip/\${sunoId}.m4a\`,
        \`https://cdn1.suno.ai/\${sunoId}.mp3\`
      ];
      let fetchRes = null;
      let urlUsed = "";
      for (const url of urlsToTry) {
         fetchRes = await fetch(url);
         if (fetchRes.ok) {
            urlUsed = url;
            break;
         }
      }

      if (!fetchRes || !fetchRes.ok) {
        return res.status(400).json({ error: \`Failed to download audio from Suno: \${fetchRes ? fetchRes.statusText : "Unknown"}\` });
      }

      const ext = urlUsed.endsWith(".mp4") ? ".mp4" : urlUsed.endsWith(".mp3") ? ".mp3" : ".m4a";
      const inputPathWithExt = \`/tmp/\${sunoId}_\${Date.now()}\${ext}\`;
      const outputPath = \`/tmp/\${sunoId}_\${Date.now()}.mp3\`;`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('server.ts', content);
  console.log("Successfully patched server.ts");
} else {
  console.log("Target string not found.");
}
