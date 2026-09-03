const fsSync = require('fs');
let content = fsSync.readFileSync('server.ts', 'utf-8');

const target = `
        if (code !== 0) {
          fs.unlink(inputPathWithExt).catch(() => {});
          console.error("FFmpeg Error:", stderrLog);
          if (!res.headersSent) res.status(500).json({ error: "FFmpeg conversion failed: " + stderrLog });
          return;
        }
`;

const replacement = `
        if (code !== 0) {
          fs.unlink(inputPathWithExt).catch(() => {});
          console.error("FFmpeg Error:", stderrLog);
          
          if (!res.headersSent) {
             let customError = "FFmpeg conversion failed.";
             if (stderrLog.includes("moov atom not found")) {
                customError = "The file is an incomplete/corrupted M4A/MP4 stream (missing 'moov' atom). It was likely downloaded improperly from the stream. Please download the file correctly.";
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
