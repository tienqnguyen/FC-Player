const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf-8');

const injection = `
  app.post("/api/convert-audio-url", express.json(), async (req, res) => {
    try {
      const { sunoId } = req.body;
      if (!sunoId) {
        return res.status(400).json({ error: "No Suno ID provided" });
      }

      const url = \`https://cdn1.suno.ai/\${sunoId}.m4a\`;
      const inputPathWithExt = \`/tmp/\${sunoId}_\${Date.now()}.m4a\`;
      const outputPath = \`/tmp/\${sunoId}_\${Date.now()}.mp3\`;

      const fetchRes = await fetch(url);
      if (!fetchRes.ok) {
        return res.status(400).json({ error: \`Failed to download audio from Suno: \${fetchRes.statusText}\` });
      }

      const buffer = await fetchRes.arrayBuffer();
      await fs.writeFile(inputPathWithExt, Buffer.from(buffer));

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

      const subprocess = spawn("ffmpeg", ffmpegArgs);
      
      let stderrLog = "";
      subprocess.stderr.on("data", (data) => {
        stderrLog += data.toString();
        console.log(data.toString());
      });
      
      subprocess.on("close", (code) => {
        if (code !== 0) {
          fs.unlink(inputPathWithExt).catch(() => {});
          console.error("FFmpeg Error:", stderrLog);
          if (!res.headersSent) {
             res.status(500).json({ error: "FFmpeg conversion failed." });
          }
          return;
        }

        res.download(outputPath, \`\${sunoId}.mp3\`, (err) => {
          fs.unlink(inputPathWithExt).catch(() => {});
          fs.unlink(outputPath).catch(() => {});
        });
      });

    } catch (error: any) {
      console.error("[Conversion Error]", error);
      if (!res.headersSent) {
         res.status(500).json({ error: error.message || "Conversion failed" });
      }
    }
  });

  const uploadFile = multer({ dest: "/tmp/" });
`;

content = content.replace('const uploadFile = multer({ dest: "/tmp/" });', injection);

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts successfully");
