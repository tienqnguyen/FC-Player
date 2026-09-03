const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

const target = `      let fetchRes = null;
      let urlUsed = "";
      
      try {
        const pageRes = await fetch(\`https://suno.com/song/\${sunoId}\`);
        if (pageRes.ok) {
           const pageText = await pageRes.text();
           const regex = new RegExp(\`https:\\\\/\\\\/[a-z0-9\\\\-]+\\\\.cloudfront\\\\.net\\\\/[^"\\\\'\\\\\\\\]*\${sunoId}\\\\.m4a\`, 'i');
           const match = pageText.match(regex);
           if (match) {
              const scrapedUrl = match[0];
              const testRes = await fetch(scrapedUrl);
              if (testRes.ok) {
                 fetchRes = testRes;
                 urlUsed = scrapedUrl;
              }
           }
        }
      } catch (e) {
         console.error("Failed to scrape suno page:", e);
      }

      if (!fetchRes || !fetchRes.ok) {
        const urlsToTry = [
          \`https://cdn1.suno.ai/\${sunoId}.mp4\`,
          \`https://d2lwuy8qc234o3.cloudfront.net/1/clip/\${sunoId}.m4a\`,
          \`https://cdn1.suno.ai/\${sunoId}.mp3\`
        ];
        for (const url of urlsToTry) {
           fetchRes = await fetch(url);
           if (fetchRes.ok) {
              urlUsed = url;
              break;
           }
        }
      }`;

const replacement = `      let fetchRes = null;
      let urlUsed = "";
      
      // Step 1: Try direct known URLs first
      const urlsToTry = [
        \`https://cdn1.suno.ai/\${sunoId}.mp4\`,
        \`https://d2lwuy8qc234o3.cloudfront.net/1/clip/\${sunoId}.m4a\`,
        \`https://cdn1.suno.ai/\${sunoId}.mp3\`
      ];
      for (const url of urlsToTry) {
         fetchRes = await fetch(url);
         if (fetchRes.ok) {
            urlUsed = url;
            break;
         }
      }

      // Step 2: Fallback to scraping the HTML source code
      if (!fetchRes || !fetchRes.ok) {
        try {
          const pageRes = await fetch(\`https://suno.com/song/\${sunoId}\`);
          if (pageRes.ok) {
             const pageText = await pageRes.text();
             const regex = new RegExp(\`https:\\\\/\\\\/[a-z0-9\\\\-]+\\\\.cloudfront\\\\.net\\\\/[^"\\\\'\\\\\\\\]*\${sunoId}\\\\.m4a\`, 'i');
             const match = pageText.match(regex);
             if (match) {
                const scrapedUrl = match[0];
                const testRes = await fetch(scrapedUrl);
                if (testRes.ok) {
                   fetchRes = testRes;
                   urlUsed = scrapedUrl;
                }
             }
          }
        } catch (e) {
           console.error("Failed to scrape suno page:", e);
        }
      }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('server.ts', content);
  console.log("Patched server.ts successfully");
} else {
  console.log("Target string not found!");
}
