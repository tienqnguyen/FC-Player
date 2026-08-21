const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Add import
code = code.replace(
  'formatLyric,\n  improveLyric,\n  addChordsLyric,\n} from "./server/lyricProcessor";',
  'formatLyric,\n  improveLyric,\n  addChordsLyric,\n  bypassLyric,\n} from "./server/lyricProcessor";'
);

// 2. Add API route
const addChordsRoute = `  app.post("/api/lyric/chords", express.json(), async (req, res) => {
    try {
      const { lyric } = req.body;
      if (!lyric) {
        return res.status(400).json({ error: "lyric is required" });
      }
      const result = await addChordsLyric(lyric);
      res.json(result);
    } catch (error: any) {
      console.error("[Lyric Chords Error]", error);
      res.status(500).json({ error: error.message });
    }
  });`;

const bypassRoute = `  app.post("/api/lyric/bypass", express.json(), async (req, res) => {
    try {
      const { lyric } = req.body;
      if (!lyric) {
        return res.status(400).json({ error: "lyric is required" });
      }
      const result = await bypassLyric(lyric);
      res.json(result);
    } catch (error: any) {
      console.error("[Lyric Bypass Error]", error);
      res.status(500).json({ error: error.message });
    }
  });`;

code = code.replace(addChordsRoute, addChordsRoute + "\n\n" + bypassRoute);

fs.writeFileSync('server.ts', code);
console.log("Patched server");
