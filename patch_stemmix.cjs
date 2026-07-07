const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
// add multer for file uploads
const multerIndex = content.indexOf('import cors from "cors";');
content = content.slice(0, multerIndex) + 'import multer from "multer";\n' + content.slice(multerIndex);

const stemmixIndex = content.indexOf('app.post("/api/stemmix",');
const stemmixReplacement = `const upload = multer({ storage: multer.memoryStorage() });
  app.post("/api/stemmix", upload.single('audio_file'), async (req, res) => {
    try {
      let audioUrl = req.body.audioUrl;
      let targetUrl = audioUrl;
      let blob;

      if (req.file) {
        // Uploaded file
        blob = new Blob([req.file.buffer]);
        console.log(\`[Stemmix] Received uploaded file: \${req.file.originalname} (\${blob.size} bytes)\`);
        targetUrl = "uploaded_file";
      } else {
        if (!audioUrl) {
          return res.status(400).json({ error: "No audio URL or file provided" });
        }
        console.log(\`[Stemmix] Separating stems for: \${audioUrl}\`);
        
        const headers = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        };
        if (targetUrl.includes("/api/proxy-stream?url=")) {
          targetUrl = decodeURIComponent(targetUrl.split("url=")[1]);
          headers["Referer"] = "https://www.nhaccuatui.com/";
          headers["Origin"] = "https://www.nhaccuatui.com";
        }
        console.log(\`[Stemmix] Fetching audio from: \${targetUrl}\`);
        const audioResponse = await fetch(targetUrl, { headers });
        if (!audioResponse.ok) {
           throw new Error(\`Failed to fetch audio for Stemmix. Status: \${audioResponse.status}\`);
        }
        const arrayBuffer = await audioResponse.arrayBuffer();
        blob = new Blob([arrayBuffer]);
        console.log(\`[Stemmix] Downloaded audio blob: \${blob.size} bytes. Initiating HF separation...\`);
      }

      const { client, handle_file } = await import("@gradio/client");
      let hfApp;
      let result;
      let success = false;
      let errorMsg = "";

      const spaces = ["PeachJed/Stemmix", "tienqnguyen95/Stemmix", "sociallyclever/demucs"];

      const runSeparation = async () => {
        for (const space of spaces) {
          try {
            console.log(\`[Stemmix] Attempting to load Hugging Face Space: \${space}\`);
            const hfApp = await client(space);
            const res = await hfApp.predict("/separate_stems", {
              audio_file: handle_file(blob),
            });
            if (res && res.data) {
              console.log(\`[Stemmix] Successfully separated stems using Space: \${space}\`);
              return res;
            }
          } catch (e) {
            console.warn(\`[Stemmix] Failed using Space \${space}:\`, e.message);
            errorMsg = e.message || String(e);
          }
        }
        return null;
      };

      try {
         result = await Promise.race([
             runSeparation(),
             new Promise((_, reject) => setTimeout(() => reject(new Error("AI Cloud processing took too long. Falling back to local DSP.")), 45000))
         ]);
         if (result && result.data) {
             success = true;
         }
      } catch (timeoutErr) {
         console.warn("[Stemmix] Timeout:", timeoutErr.message);
      }

      if (success && result && result.data) {
        const stems = {
            drums: result.data[2]?.url || null,
            bass: result.data[3]?.url || null,
            other: result.data[4]?.url || null,
            vocals: result.data[5]?.url || null,
            guitar: result.data[6]?.url || null,
            piano: result.data[7]?.url || null,
            isDspFallback: false
        };
        return res.json({ success: true, stems });
      }

      console.log(\`[Stemmix] AI separation spaces failed.\`);
      return res.status(503).json({ 
        success: false, 
        error: "AI Cloud servers are currently overloaded or offline. Please select the ⚡ WebGPU mode to process it locally." 
      });
    } catch (error) {
      console.error("[Stemmix Error]", error);
      res.status(500).json({ error: error.message || "Failed to separate stems" });
    }
  });`;

// Remove the old app.post("/api/stemmix", ...) until the next app.get
const nextRouteIndex = content.indexOf('app.get("/api/nhaccuatui/playlist"', stemmixIndex);
content = content.slice(0, stemmixIndex) + stemmixReplacement + "\n\n  " + content.slice(nextRouteIndex);

fs.writeFileSync('server.ts', content);
