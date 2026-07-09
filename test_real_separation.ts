import { client, handle_file } from "@gradio/client";
import fs from "fs";

async function run() {
  try {
    console.log("Reading audio_sample.wav...");
    const buffer = fs.readFileSync("audio_sample.wav");
    const blob = new Blob([buffer]);

    const space = "PeachJed/Stemmix";
    console.log(`Connecting to: ${space}`);
    const hfApp = await client(space as any);
    console.log("Connected successfully. Sending prediction...");

    const result = await hfApp.predict("/separate_stems", {
      audio_file: handle_file(blob),
    });

    console.log("Prediction finished. Result data:", JSON.stringify(result, null, 2));

    if (result && result.data && Array.isArray(result.data)) {
      const spaceUrl = `https://${space.replace('/', '-')}.hf.space`;
      const getUrl = (item: any) => {
        if (!item) return null;
        let u = typeof item === 'string' ? item : (item.url || item.path);
        if (!u || typeof u !== 'string') return null;
        if (u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost') || u.startsWith('http://0.0.0.0')) {
          const urlObj = new URL(u);
          u = `${spaceUrl}${urlObj.pathname}${urlObj.search}`;
        } else if (u.startsWith('/')) {
          u = `${spaceUrl}${u}`;
        }
        return u;
      };

      for (const item of result.data) {
        const u = getUrl(item);
        if (u) {
          console.log(`\nTesting fetch on URL: ${u}`);
          try {
            const res = await fetch(u);
            console.log(`Fetch status: ${res.status} ${res.statusText}`);
          } catch (err: any) {
            console.error(`Fetch error: ${err.message}`);
          }

          console.log(`Testing hfApp.fetch on URL: ${u}`);
          try {
            const res = await hfApp.fetch(u);
            console.log(`hfApp.fetch status: ${res.status} ${res.statusText}`);
            if (res.ok) {
              const buf = await res.arrayBuffer();
              console.log(`Successfully fetched ${buf.byteLength} bytes via hfApp.fetch!`);
            }
          } catch (err: any) {
            console.error(`hfApp.fetch error: ${err.message}`);
          }
        }
      }
    }
  } catch (err: any) {
    console.error("Separation test failed:", err.message);
  }
}

run();
