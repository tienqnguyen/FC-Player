import fs from "node:fs/promises";

async function test() {
  const fileContent = await fs.readFile("nuxt_data.json", "utf-8");
  const dataObj = JSON.parse(fileContent);

  function hydrate(index: any, seen = new Map()): any {
    if (typeof index !== "number") {
      return index;
    }
    if (seen.has(index)) {
      return seen.get(index);
    }
    
    const val = dataObj[index];
    if (val === null || val === undefined) {
      return val;
    }

    if (typeof val !== "object") {
      seen.set(index, val);
      return val;
    }

    if (Array.isArray(val)) {
      const res: any[] = [];
      seen.set(index, res);
      for (const item of val) {
        res.push(hydrate(item, seen));
      }
      return res;
    } else {
      const res: any = {};
      seen.set(index, res);
      for (const [key, item] of Object.entries(val)) {
        res[key] = hydrate(item, seen);
      }
      return res;
    }
  }

  // Hydrate index 120
  const song120 = hydrate(120);
  console.log("Song 120 hydrated:", JSON.stringify(song120, null, 2));
}
test();
