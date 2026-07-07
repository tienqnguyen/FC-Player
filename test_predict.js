import { client, handle_file } from "@gradio/client";

async function run() {
  try {
    console.log("Creating dummy blob...");
    // A tiny wave header/file dummy
    const dummyData = new Uint8Array(1000);
    const blob = new Blob([dummyData], { type: "audio/wav" });
    
    console.log("Loading PeachJed/Stemmix...");
    const hfApp = await client("PeachJed/Stemmix");
    console.log("Loaded space. Sending predict request...");
    const res = await hfApp.predict("/separate_stems", {
      audio_file: handle_file(blob),
    });
    console.log("Predict response:", res);
  } catch (err) {
    console.error("Predict error caught:");
    console.error(err);
    if (err.cause) {
      console.error("Cause:", err.cause);
    }
  }
}

run();
