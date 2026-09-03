const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

const injection = `
  app.get("/api/suno-info", async (req, res) => {
    try {
      const { sunoId } = req.query;
      if (!sunoId) {
        return res.status(400).json({ error: "No Suno ID provided" });
      }

      const oembedUrl = \`https://studio-api.prod.suno.com/api/oembed?url=https%3A%2F%2Fsuno.com%2Fsong%2F\${sunoId}\`;
      const fetchRes = await fetch(oembedUrl);
      
      let title = sunoId;
      if (fetchRes.ok) {
         const data = await fetchRes.json();
         if (data && data.title) {
            title = data.title;
         }
      }

      // We can also provide the expected direct links
      const mp4Url = \`https://cdn1.suno.ai/\${sunoId}.mp4\`;
      const m4aUrl = \`https://d2lwuy8qc234o3.cloudfront.net/1/clip/\${sunoId}.m4a\`;

      res.json({ title, mp4Url, m4aUrl, sunoId });
    } catch (e: any) {
      console.error("Failed to fetch suno info:", e);
      res.status(500).json({ error: e.message || "Failed to fetch info" });
    }
  });

  app.post("/api/convert-audio-url",
`;

content = content.replace('  app.post("/api/convert-audio-url",', injection);

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts with info endpoint");
