const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (code.includes('bypassLyric,')) {
    code = code.replace('bypassLyric,', 'bypassLyric,\n  arrangeLyric,');
}

const endpoint = `
  app.post("/api/lyric/arrange", express.json(), async (req, res) => {
    try {
      const { lyric } = req.body;
      if (!lyric) {
        return res.status(400).json({ error: "lyric is required" });
      }
      const result = await arrangeLyric(lyric);
      res.json(result);
    } catch (error: any) {
      console.error("[Lyric Arrange Error]", error);
      res.status(500).json({ error: error.message });
    }
  });
`;

code = code.replace('app.post("/api/lyric/bypass"', endpoint + '\n  app.post("/api/lyric/bypass"');

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts successfully");
