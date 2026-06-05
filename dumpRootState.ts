import fs from "node:fs/promises";

async function test() {
  const content = await fs.readFile("hydrated_root.json", "utf-8");
  const root = JSON.parse(content);

  console.log("Root Top-Level Keys:", Object.keys(root));

  if (root.state) {
    console.log("State subkeys:", Object.keys(root.state));
    for (const [k, v] of Object.entries(root.state)) {
      if (v && typeof v === "object") {
        console.log(`  state["${k}"]:`, Object.keys(v));
      } else {
        console.log(`  state["${k}"]:`, v);
      }
    }
  }

  if (root.pinia) {
    console.log("Pinia subkeys:", Object.keys(root.pinia));
    for (const [k, v] of Object.entries(root.pinia)) {
      if (v && typeof v === "object") {
        console.log(`  pinia["${k}"]:`, Object.keys(v));
      } else {
        console.log(`  pinia["${k}"]:`, v);
      }
    }
  }
}
test();
