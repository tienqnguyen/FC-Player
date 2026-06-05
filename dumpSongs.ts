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

  // Find all song names in the entire dataObj
  const songNamesByArtist = new Map<string, string>();
  for (let i = 0; i < dataObj.length; i++) {
    const item = hydrate(i);
    if (item && typeof item === "object" && !Array.isArray(item)) {
      if (item.name && item.artistName && item.streamURL) {
        songNamesByArtist.set(item.name, item.artistName);
      }
    }
  }

  console.log("Total unique songs extracted from this page state:", songNamesByArtist.size);
  console.log("All extracted song names & artists from the page state:");
  console.log(Array.from(songNamesByArtist.entries()).map(([k, v]) => `- "${k}" by "${v}"`));
}
test();
