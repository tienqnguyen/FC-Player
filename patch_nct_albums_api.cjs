const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const nctAlbumsApi = `
  app.get("/api/nhaccuatui/albums", async (req, res) => {
    try {
      const cacheKey = "nct_home_albums";
      const cached = await getCachedData<any>("nct_albums", cacheKey);
      if (cached) {
        return res.json({ success: true, albums: cached });
      }

      const response = await fetch('https://www.nhaccuatui.com/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const html = await response.text();
      
      const match = html.match(/<script type=\\"application\\/json\\" data-nuxt-data=\\"nuxt-app\\"[^>]*>(.*?)<\\/script>/s);
      let results: any[] = [];
      if (match) {
        const data = JSON.parse(match[1]);
        for (let i = 0; i < data.length; i++) {
            if (typeof data[i] === 'string' && data[i].length === 12 && /^[a-zA-Z0-9]+$/.test(data[i])) {
                let title = null;
                let image = null;
                for (let j = 1; j <= 10; j++) {
                   if (!title && typeof data[i+j] === 'string' && data[i+j].length > 5 && !data[i+j].startsWith('http')) {
                       title = data[i+j];
                   }
                   if (!image && typeof data[i+j] === 'string' && data[i+j].includes('image-cdn.nct.vn/playlist')) {
                       image = data[i+j];
                   }
                }
                if (title && image && !results.find(r => r.id === data[i])) {
                    results.push({ id: data[i], title, image });
                }
            }
        }
      }

      if (results.length > 0) {
        // Cache for 24 hours
        await setCachedData("nct_albums", cacheKey, results);
        return res.json({ success: true, albums: results });
      } else {
        return res.status(500).json({ success: false, error: "No albums found" });
      }
    } catch (error: any) {
      console.error("[NCT Albums Error]", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });
`;

content = content.replace(/  app\.get\("\/api\/nhaccuatui\/playlist", async \(req, res\) => \{/, nctAlbumsApi + '\n  app.get("/api/nhaccuatui/playlist", async (req, res) => {');

fs.writeFileSync('server.ts', content);
