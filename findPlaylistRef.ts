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

  // Find occurrences of lQ61iLbyjGq7
  const matches: number[] = [];
  dataObj.forEach((val: any, idx: number) => {
    if (typeof val === "string" && val.includes("lQ61iLbyjGq7")) {
      matches.push(idx);
    }
  });

  console.log("Matches of playlist key 'lQ61iLbyjGq7' indices:", matches);
  for (const idx of matches) {
    console.log(`Index ${idx}:`, dataObj[idx]);
    
    // Find who references this index
    const referrers: number[] = [];
    dataObj.forEach((parentVal: any, parentIdx: number) => {
      if (parentVal && typeof parentVal === "object") {
        if (Array.isArray(parentVal)) {
          if (parentVal.includes(idx)) referrers.push(parentIdx);
        } else {
          if (Object.values(parentVal).includes(idx)) referrers.push(parentIdx);
        }
      }
    });
    console.log("  Referenced by parents:", referrers);
    for (const ridx of referrers) {
      console.log(`  Parent ${ridx} value:`, JSON.stringify(dataObj[ridx]).substring(0, 300));
      const gp = hydrate(ridx);
      console.log(`  Hydrated GP keys:`, Object.keys(gp));
      // Log some fields if it has a list or child
      if (gp.list) {
         console.log(`  GP.list size:`, gp.list.length);
         if (gp.list.length > 0) {
           console.log(`  GP.list[0] keys:`, Object.keys(gp.list[0]));
           console.log(`  GP.list[0] name:`, gp.list[0].name);
         }
      }
    }
  }
}
test();
