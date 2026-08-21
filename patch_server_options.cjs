const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetEndpoint = `app.post("/api/lyric/arrange", express.json(), async (req, res) => {
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
  });`;

const newEndpoint = `app.post("/api/lyric/arrange", express.json(), async (req, res) => {
    try {
      const { lyric, options } = req.body;
      if (!lyric) {
        return res.status(400).json({ error: "lyric is required" });
      }
      const result = await arrangeLyric(lyric, options || {});
      res.json(result);
    } catch (error: any) {
      console.error("[Lyric Arrange Error]", error);
      res.status(500).json({ error: error.message });
    }
  });`;

if (code.includes(targetEndpoint)) {
    code = code.replace(targetEndpoint, newEndpoint);
    fs.writeFileSync('server.ts', code);
    console.log("Patched server.ts successfully.");
} else {
    // try a more generic replace
    console.log("Target exact string not found, trying regex...");
    const regex = /app\.post\("\/api\/lyric\/arrange", express\.json\(\), async \(req, res\) => \{[\s\S]*?\}\);/;
    if (regex.test(code)) {
        code = code.replace(regex, newEndpoint);
        fs.writeFileSync('server.ts', code);
        console.log("Patched server.ts via regex successfully.");
    } else {
        console.log("Could not patch server.ts!");
    }
}
