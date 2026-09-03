const fsSync = require('fs');
let content = fsSync.readFileSync('server.ts', 'utf-8');

const target = `
      const ext = path.extname(req.file.originalname || "");
      const inputPathWithExt = inputPath + ext;
      await fs.rename(inputPath, inputPathWithExt);
      const outputPath = inputPath + ".mp3";
      
      const ffmpegArgs = [
        "-i", inputPathWithExt,
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        "-y",
        outputPath
      ];
      
      const subprocess = spawn("ffmpeg", ffmpegArgs);
`;

const replacement = `
      const ext = path.extname(req.file.originalname || "");
      const inputPathWithExt = inputPath + ext;
      await fs.rename(inputPath, inputPathWithExt);
      const outputPath = inputPath + ".mp3";
      
      // Read first 100 bytes to check if it's actually an HTML/Text file instead of audio
      const buffer = Buffer.alloc(100);
      const fd = await fs.open(inputPathWithExt, 'r');
      await fd.read(buffer, 0, 100, 0);
      await fd.close();
      
      const headerText = buffer.toString('utf-8').trim().toLowerCase();
      if (headerText.startsWith('<!doctype html') || headerText.startsWith('<html') || headerText.includes('<body') || headerText.startsWith('{') || headerText.includes('<?xml')) {
         await fs.unlink(inputPathWithExt).catch(()=>{});
         return res.status(400).json({ error: "File appears to be an HTML/Text error page (maybe a failed download from Suno?), not a valid audio file. Please check the file on your computer." });
      }

      const ffmpegArgs = [
        "-err_detect", "ignore_err",
        "-i", inputPathWithExt,
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        "-y",
        outputPath
      ];
      
      const subprocess = spawn("ffmpeg", ffmpegArgs);
`;

if (content.includes(target.trim())) {
  content = content.replace(target.trim(), replacement.trim());
  fsSync.writeFileSync('server.ts', content);
  console.log("Patched!");
} else {
  console.log("Target not found!");
}
