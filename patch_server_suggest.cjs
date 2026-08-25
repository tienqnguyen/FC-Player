const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const routeCode = `
  app.post("/api/lyric/suggest", express.json(), async (req, res) => {
    try {
      const { selectedText, instruction } = req.body;
      if (!selectedText) {
        return res.status(400).json({ error: "selectedText is required" });
      }
      
      const { suggestLyricTags } = require("./server/lyricProcessor");
      const result = await suggestLyricTags(selectedText, instruction || "");
      res.json(result);
    } catch (error: any) {
      console.error("[Lyric Suggest Error]", error);
      res.status(500).json({ error: error.message });
    }
  });
`;

if (!content.includes('app.post("/api/lyric/suggest"')) {
    content = content.replace(
        'app.post("/api/lyric/bypass"',
        routeCode + '\n  app.post("/api/lyric/bypass"'
    );
    fs.writeFileSync('server.ts', content);
    console.log('Patched server.ts with /api/lyric/suggest');
} else {
    console.log('Route already exists in server.ts');
}
