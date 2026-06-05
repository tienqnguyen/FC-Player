import fs from "node:fs/promises";

async function test() {
  const content = await fs.readFile("hydrated_root.json", "utf-8");
  const root = JSON.parse(content);

  const data = root.data;
  console.log("data entries count:", Object.keys(data).length);
  for (const [key, val] of Object.entries(data)) {
    console.log(`Key: "${key}", Type: ${typeof val}`);
    if (val && typeof val === "object") {
      console.log(`  Keys:`, Object.keys(val));
      if ("indexDataDetail" in val) {
        console.log("  FOUND indexDataDetail in", key);
        const detail = (val as any).indexDataDetail;
        console.log("  indexDataDetail detail:", Object.keys(detail));
        console.log("  indexDataDetail Title:", detail.title);
        console.log("  Songs list count:", detail.list?.length);
        if (detail.list?.length > 0) {
          console.log("  Song 0:", JSON.stringify(detail.list[0], null, 2));
        }
      }
    }
  }
}
test();
