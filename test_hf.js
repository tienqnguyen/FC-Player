import { client } from "@gradio/client";

async function test() {
  try {
    console.log("Loading PeachJed/Stemmix...");
    const app = await client("PeachJed/Stemmix");
    console.log("Loaded PeachJed/Stemmix successfully!");
  } catch (err) {
    console.error("Error loading PeachJed/Stemmix:", err);
  }
}

test();
