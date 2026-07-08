const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const route = `
  app.get('/api/tk-search', async (req, res) => {
    try {
      const { q, p = 1 } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Query 'q' is required" });
      }
      
      const url = \`https://lyric.tkaraoke.com/s.tim?q=\${encodeURIComponent(q)}&t=11&p=\${p}\`;
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      const cheerio = require('cheerio');
      const $ = cheerio.load(response.data);
      
      const videos: any[] = [];
      $('.div-result-item').each((i: number, el: any) => {
        const titleEl = $(el).find('.h4-title-song a');
        const title = titleEl.text().trim();
        const tkLink = 'https://lyric.tkaraoke.com' + titleEl.attr('href');
        const id = titleEl.attr('href')?.split('/')[1] || \`tk-\${i}\`;
        
        const author = $(el).find('.p-author a').text().trim();
        const singer = $(el).find('.p-singer a').text().trim() || "Unknown";
        
        videos.push({
          id,
          title,
          author: singer + (author ? \` (Composer: \${author})\` : ''),
          originalUrl: tkLink,
          duration: 0,
          cover: "https://lyric.tkaraoke.com/resources/images/fblogo.jpg"
        });
      });
      
      return res.json({ videos });
    } catch (error: any) {
      console.error("[TK Search Error]", error.message);
      return res.status(500).json({ error: "Failed to fetch TK search results" });
    }
  });
`;

if (!code.includes('/api/tk-search')) {
  code = code.replace(/app\.get\('\/api\/nct-search'/g, route + "\n  app.get('/api/nct-search'");
  fs.writeFileSync('server.ts', code);
  console.log("Patched server.ts");
}
