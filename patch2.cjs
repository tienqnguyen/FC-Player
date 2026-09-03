const fsSync = require('fs');
let content = fsSync.readFileSync('server.ts', 'utf-8');

const target = `
      const fsSync = await import("fs");
      const ext = path.extname(req.file.originalname || "");
      const inputPathWithExt = inputPath + ext;
      fsSync.renameSync(inputPath, inputPathWithExt);
      const outputPath = inputPath + ".mp3";
`;

const replacement = `
      const ext = path.extname(req.file.originalname || "");
      const inputPathWithExt = inputPath + ext;
      await fs.rename(inputPath, inputPathWithExt);
      const outputPath = inputPath + ".mp3";
`;

if (content.includes(target.trim())) {
  content = content.replace(target.trim(), replacement.trim());
  content = content.replace(/fsSync\.unlink/g, "fs.unlink");
  fsSync.writeFileSync('server.ts', content);
  console.log("Patched!");
} else {
  console.log("Target not found!");
}
