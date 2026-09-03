const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const target = `
      res.setHeader("Content-Disposition", \`attachment; filename="converted.mp3"\`);
      res.setHeader("Content-Type", "audio/mpeg");
      
      const ffmpegArgs = [
        "-i", inputPath,
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        "-f", "mp3",
        "-"
      ];
      
      const subprocess = spawn("ffmpeg", ffmpegArgs);
      
      subprocess.stdout.pipe(res);
      subprocess.stderr.on("data", (data) => console.log(data.toString()));
      
      subprocess.on("close", () => {
         import("fs/promises").then(fs => fs.unlink(inputPath).catch(console.error));
      });
`;

const replacement = `
      const fsSync = await import("fs");
      const ext = path.extname(req.file.originalname || "");
      const inputPathWithExt = inputPath + ext;
      fsSync.renameSync(inputPath, inputPathWithExt);
      const outputPath = inputPath + ".mp3";
      
      const ffmpegArgs = [
        "-i", inputPathWithExt,
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        "-y",
        outputPath
      ];
      
      const subprocess = spawn("ffmpeg", ffmpegArgs);
      
      let stderrLog = "";
      subprocess.stderr.on("data", (data) => {
        stderrLog += data.toString();
        console.log(data.toString());
      });
      
      subprocess.on("close", (code) => {
        if (code !== 0) {
          fsSync.unlink(inputPathWithExt, () => {});
          console.error("FFmpeg Error:", stderrLog);
          if (!res.headersSent) res.status(500).json({ error: "FFmpeg conversion failed: " + stderrLog });
          return;
        }
        res.download(outputPath, "converted.mp3", (err) => {
          fsSync.unlink(inputPathWithExt, () => {});
          fsSync.unlink(outputPath, () => {});
        });
      });
`;

if (content.includes('res.setHeader("Content-Disposition"')) {
  // We just replace everything inside the try block
  content = content.replace(target.trim(), replacement.trim());
  fs.writeFileSync('server.ts', content);
  console.log("Patched!");
} else {
  console.log("Target not found!");
}
