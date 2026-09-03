#!/bin/bash
sed -i '2551i\
  const upload = multer({ dest: "/tmp/" });\
\
  app.post("/api/convert-audio", upload.single("file"), (req, res) => {\
    try {\
      if (!req.file) {\
        return res.status(400).json({ error: "No file uploaded" });\
      }\
      const inputPath = req.file.path;\
      \
      res.setHeader("Content-Disposition", `attachment; filename="converted.mp3"`);\
      res.setHeader("Content-Type", "audio/mpeg");\
      \
      const ffmpegArgs = [\
        "-i", inputPath,\
        "-c:a", "libmp3lame",\
        "-b:a", "192k",\
        "-f", "mp3",\
        "-"\
      ];\
      \
      const subprocess = spawn("ffmpeg", ffmpegArgs);\
      \
      subprocess.stdout.pipe(res);\
      \
      subprocess.on("close", () => {\
         import("fs/promises").then(fs => fs.unlink(inputPath).catch(console.error));\
      });\
    } catch (error: any) {\
      console.error("[Conversion Error]", error);\
      if (!res.headersSent) {\
         res.status(500).json({ error: error.message || "Conversion failed" });\
      }\
    }\
  });\
' server.ts
