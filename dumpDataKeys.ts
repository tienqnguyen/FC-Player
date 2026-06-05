import fs from "node:fs/promises";

async function test() {
  const content = await fs.readFile("hydrated_root.json", "utf-8");
  const root = JSON.parse(content);
  
  const data = root.data;
  console.log("Keys in data of hydrated_root.json:", Object.keys(data));
  for (const [key, val] of Object.entries(data)) {
    console.log(`-- Key: ${key} (${typeof val}) --`);
    if (val && typeof val === "object") {
      console.log(`   Keys inside:`, Object.keys(val));
      // Let's print out the titles or logPrefixs
      if (Array.isArray(val)) {
        console.log(`   It's an array of length ${val.length}`);
      } else {
        // Let's print first-level fields
        for (const [subDefKey, subDefVal] of Object.entries(val)) {
          if (subDefVal && typeof subDefVal === "object") {
            console.log(`     Subkey: "${subDefKey}" (Object), fields:`, Object.keys(subDefVal));
          } else {
            console.log(`     Subkey: "${subDefKey}" (Primitive):`, subDefVal);
          }
        }
      }
    } else {
      console.log(`   Value:`, val);
    }
  }
}
test();
