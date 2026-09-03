const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

const targetSnippet = `  app.post("/api/convert-audio", uploadFile.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const inputPath = req.file.path;`;

if (!content.includes('app.post("/api/convert-audio", uploadFile.single("file")')) {
    console.error("Target logic not found");
    process.exit(1);
}

console.log("Found target, waiting for more details.");
