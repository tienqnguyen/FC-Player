const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `        const res = await fetch("/api/stemmix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioUrl })
        });
        const data = await res.json();`;

const replacement = `        let res;
        if (audioUrl.startsWith("blob:")) {
          // Fetch the local blob and send it as a file
          const blobRes = await fetch(audioUrl);
          const blobData = await blobRes.blob();
          const formData = new FormData();
          formData.append("audio_file", blobData, "audio.wav");
          formData.append("audioUrl", audioUrl);
          
          res = await fetch("/api/stemmix", {
            method: "POST",
            body: formData
          });
        } else {
          res = await fetch("/api/stemmix", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioUrl })
          });
        }
        const data = await res.json();`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);
