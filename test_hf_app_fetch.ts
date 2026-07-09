import { client } from "@gradio/client";

async function run() {
  try {
    console.log("Connecting to Gradio space...");
    const hfApp = await client("tienqnguyen95/Stemmix" as any);
    console.log("Connected.");

    const testUrl = "https://tienqnguyen95-stemmix.hf.space/gradio_api/file=/tmp/gradio/test.wav";
    console.log("Fetching test url via hfApp.fetch...");
    const res = await hfApp.fetch(testUrl);
    console.log("hfApp.fetch status:", res.status);
    const text = await res.text();
    console.log("hfApp.fetch body:", text.slice(0, 300));
  } catch (err: any) {
    console.error("Test failed:", err.message);
  }
}
run();
