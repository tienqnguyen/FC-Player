import fs from "node:fs/promises";

async function test() {
  const content = await fs.readFile("hydrated_root.json", "utf-8");
  const root = JSON.parse(content);

  const pinia = root.pinia["1"];
  console.log("Pinia stores keys:", Object.keys(pinia));

  if (pinia.musicPlayer) {
    console.log("\npinia.musicPlayer properties:", Object.keys(pinia.musicPlayer));
    for (const [k, v] of Object.entries(pinia.musicPlayer)) {
      if (v && typeof v === "object") {
        console.log(`  musicPlayer["${k}"] keys:`, Object.keys(v));
        if (Array.isArray(v)) {
           console.log(`  musicPlayer["${k}"] is array of length ${v.length}`);
           if (v.length > 0) {
              console.log(`  musicPlayer["${k}"][0] keys:`, Object.keys(v[0]));
              console.log(`  musicPlayer["${k}"][0] name:`, (v[0] as any).name);
           }
        }
      } else {
        console.log(`  musicPlayer["${k}"] value:`, v);
      }
    }
  }

  if (pinia.index) {
    console.log("\npinia.index properties:", Object.keys(pinia.index));
    for (const [k, v] of Object.entries(pinia.index)) {
      if (v && typeof v === "object") {
         console.log(`  index["${k}"] keys:`, Object.keys(v));
         if (Array.isArray(v)) {
            console.log(`  index["${k}"] is array size ${v.length}`);
         } else {
            console.log(`  index["${k}"] type/value sample:`, JSON.stringify(v).substring(0, 500));
         }
      } else {
         console.log(`  index["${k}"] value:`, v);
      }
    }
  }
}
test();
