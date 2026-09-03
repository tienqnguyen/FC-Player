const fsSync = require('fs');
let content = fsSync.readFileSync('server.ts', 'utf-8');

const target = `
        if (code !== 0) {
          fs.unlink(inputPathWithExt, () => {});
          console.error("FFmpeg Error:", stderrLog);
          if (!res.headersSent) res.status(500).json({ error: "FFmpeg conversion failed: " + stderrLog });
          return;
        }
`;

const replacement = `
        if (code !== 0) {
          fs.unlink(inputPathWithExt, () => {});
          console.error("FFmpeg Error:", stderrLog);
          
          if (!res.headersSent) {
             let customError = "FFmpeg conversion failed: " + stderrLog;
             if (stderrLog.includes("moov atom not found")) {
                customError = "The file is an incomplete or corrupted MP4/M4A download (missing 'moov' header atom). This usually happens when a stream is downloaded without its initialization segment. The file cannot be decoded.";
             } else if (stderrLog.includes("Invalid data found when processing input")) {
                customError = "The file format could not be recognized. It might be corrupted or not a valid audio file.";
             }
             res.status(500).json({ error: customError });
          }
          return;
        }
`;

if (content.includes(target.trim())) {
  content = content.replace(target.trim(), replacement.trim());
  fsSync.writeFileSync('server.ts', content);
  console.log("Patched!");
} else {
  console.log("Target not found!");
}
