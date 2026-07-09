import { client, handle_file } from "@gradio/client";
import fs from "fs";

async function testSpace(space: string, blob: Blob) {
  console.log(`\n========================================`);
  console.log(`Testing space: ${space}`);
  console.log(`========================================`);
  try {
    const hfApp = await client(space as any);
    console.log(`[${space}] Connected successfully.`);
    console.log(`[${space}] Sending prediction...`);
    const result = await hfApp.predict("/separate_stems", {
      audio_file: handle_file(blob),
    });
    console.log(`[${space}] Success! Result data:`, JSON.stringify(result, null, 2));
    return { space, success: true, result };
  } catch (err: any) {
    console.error(`[${space}] Failed:`, err.message || err);
    if (err.stack) {
      console.error(err.stack);
    }
    return { space, success: false, error: err.message };
  }
}

async function run() {
  try {
    console.log("Reading audio_sample.wav...");
    const buffer = fs.readFileSync("audio_sample.wav");
    const blob = new Blob([buffer]);

    const spaces = [
      "tienqnguyen95/Stemmix",
      "PeachJed/Stemmix",
      "sociallyclever/demucs",
      "vumichien/demucs",
      "akhaliq/demucs"
    ];

    for (const space of spaces) {
      const res = await testSpace(space, blob);
      if (res.success) {
        console.log(`\n🎉 Found a working space! ${space}`);
        break;
      }
    }
  } catch (err: any) {
    console.error("Outer runner failed:", err.message);
  }
}

run();
