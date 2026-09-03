const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const target = `
      const ffmpegArgs = [
        "-err_detect", "ignore_err",
        "-i", inputPathWithExt,
        "-vn",
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        "-y",
        outputPath
      ];
`;

const replacement = `
      const ffmpegArgs = [
        "-analyzeduration", "100M",
        "-probesize", "100M",
        "-err_detect", "ignore_err",
        "-i", inputPathWithExt,
        "-vn",
        "-map_metadata", "-1",
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        "-y",
        outputPath
      ];
`;

if (content.includes(target.trim())) {
  content = content.replace(target.trim(), replacement.trim());
  fs.writeFileSync('server.ts', content);
  console.log("Patched FFmpeg config successfully.");
} else {
  console.log("Target not found!");
}
