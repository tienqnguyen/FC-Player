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
      // Check if it's a special collection descriptor (like [1, 2, 3])
      // In Nuxt 3, an array of numbers represents list of child indices to hydrate
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

  // Nuxt data start is usually at index 1 or 2
  // Let's print index 2 hydrated!
  console.log("Hydrating root data...");
  const root = hydrate(1);
  console.log("Root type/keys:", typeof root, root ? Object.keys(root) : "null");
  
  // Let's write the hydrated root to a file so we can view it
  await fs.writeFile("hydrated_root.json", JSON.stringify(root, null, 2));
  console.log("Wrote hydrated_root.json");
}
test();
