#!/bin/bash
sed -i '/const ffmpegArgs = \[/,/}\);/c\
      const fs = require("fs");\
      const ext = path.extname(req.file.originalname || "");\
      const inputPathWithExt = inputPath + ext;\
      fs.renameSync(inputPath, inputPathWithExt);\
      const outputPath = inputPath + ".mp3";\
      \
      const ffmpegArgs = [\
        "-i", inputPathWithExt,\
        "-c:a", "libmp3lame",\
        "-b:a", "192k",\
        "-f", "mp3",\
        outputPath\
      ];\
      \
      const subprocess = spawn("ffmpeg", ffmpegArgs);\
      \
      subprocess.stderr.on("data", (data) => console.log(data.toString()));\
      \
      subprocess.on("close", (code) => {\
        if (code !== 0) {\
          fs.unlink(inputPathWithExt, () => {});\
          if (!res.headersSent) res.status(500).json({ error: "FFmpeg conversion failed" });\
          return;\
        }\
        res.sendFile(outputPath, (err) => {\
          fs.unlink(inputPathWithExt, () => {});\
          fs.unlink(outputPath, () => {});\
        });\
      });' server.ts
