import { client, handle_file } from "@gradio/client";
import { readFileSync } from "fs";

async function run() {
  try {
    const space = "sociallyclever/demucs";
    const app = await client(space);
    // need a small audio file
    console.log("Loaded space");
  } catch (e) {
    console.error(e);
  }
}
run();
