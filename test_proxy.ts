import fetch from "node-fetch"; // or use global.fetch
import { Readable } from "stream";

async function run() {
  try {
    const url = "https://huggingface.co/spaces/tienqnguyen95/Stemmix/raw/main/README.md";
    console.log("Fetching using global fetch...");
    const res = await global.fetch(url);
    console.log("Status:", res.status);
    console.log("Headers:", [...res.headers.entries()]);
    if (res.body) {
      console.log("Body type:", res.body.constructor.name);
      try {
        const nodeStream = Readable.fromWeb(res.body as any);
        console.log("Readable.fromWeb success! stream type:", nodeStream.constructor.name);
      } catch (err: any) {
        console.error("Readable.fromWeb failed:", err.message);
      }
    } else {
      console.log("No body");
    }
  } catch (error: any) {
    console.error("Fetch failed:", error.message);
  }
}

run();
