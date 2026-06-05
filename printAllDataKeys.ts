import fs from "node:fs/promises";

async function test() {
  const content = await fs.readFile("hydrated_root.json", "utf-8");
  const root = JSON.parse(content);

  const data = root.data;
  console.log("data root properties:", Object.keys(data));
  
  // Let's print the value of key "0"
  console.log("data['0'] value:", data["0"]);

  // Let's dump all object keys in data["1"]
  const data1 = data["1"];
  console.log("data['1'] top-level keys:", Object.keys(data1));

  // Let's print nested properties of data["1"]
  for (const [k, v] of Object.entries(data1)) {
    if (v && typeof v === "object") {
      console.log(`  Key: "${k}", Keys:`, Object.keys(v));
      // If it contains songs or stream urls, print it
      const s = JSON.stringify(v);
      if (s.includes("title") || s.includes("song") || s.includes(".mp3")) {
        console.log(`  -> "${k}" contains song/title metadata!`);
      }
    } else {
      console.log(`  Key: "${k}", Primitive Value:`, v);
    }
  }
}
test();
