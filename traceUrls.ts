import fs from "node:fs/promises";

async function test() {
  const content = await fs.readFile("nuxt_data.json", "utf-8");
  const dataObj = JSON.parse(content);

  console.log("Total items in dataObj:", dataObj.length);

  // Find some index of an .mp3 URL
  const matches: number[] = [];
  dataObj.forEach((val: any, idx: number) => {
    if (typeof val === "string" && val.includes(".mp3")) {
      matches.push(idx);
    }
  });

  console.log("Matches count:", matches.length);
  console.log("First 10 matches indices:", matches.slice(0, 10));

  // For each of the first few matches, let's find which indices point to them
  // A parent index would contain an array or object referencing this match index
  for (const idx of matches.slice(0, 5)) {
    console.log(`\n--- Tracing reference to index ${idx} ("${dataObj[idx].substring(0, 60)}...") ---`);
    
    // Find who references this index
    const referrers: number[] = [];
    dataObj.forEach((parentVal: any, parentIdx: number) => {
      if (parentVal && typeof parentVal === "object") {
        if (Array.isArray(parentVal)) {
          if (parentVal.includes(idx)) {
            referrers.push(parentIdx);
          }
        } else {
          if (Object.values(parentVal).includes(idx)) {
            referrers.push(parentIdx);
          }
        }
      }
    });

    console.log(`Referenced by keys in parent indices:`, referrers);
    for (const ridx of referrers) {
      console.log(`  Parent ${ridx} value:`, JSON.stringify(dataObj[ridx]).substring(0, 150));
      // Let's trace parent of parent!
      const grandparentReferrers: number[] = [];
      dataObj.forEach((gpVal: any, gpIdx: number) => {
        if (gpVal && typeof gpVal === "object") {
          if (Array.isArray(gpVal)) {
            if (gpVal.includes(ridx)) {
              grandparentReferrers.push(gpIdx);
            }
          } else {
            if (Object.values(gpVal).includes(ridx)) {
              grandparentReferrers.push(gpIdx);
            }
          }
        }
      });
      console.log(`  Grandparents of ${ridx}:`, grandparentReferrers);
      for (const gpidx of grandparentReferrers) {
         console.log(`    Grandparent ${gpidx} value:`, JSON.stringify(dataObj[gpidx]).substring(0, 150));
         
         // Great grandparent!
         const ggpReferrers: number[] = [];
         dataObj.forEach((ggpVal: any, ggpIdx: number) => {
           if (ggpVal && typeof ggpVal === "object") {
             if (Array.isArray(ggpVal)) {
               if (ggpVal.includes(gpidx)) {
                 ggpReferrers.push(ggpIdx);
               }
             } else {
               if (Object.values(ggpVal).includes(gpidx)) {
                 ggpReferrers.push(ggpIdx);
               }
             }
           }
         });
         console.log(`    Great Grandparents of ${gpidx}:`, ggpReferrers);
         for (const ggpidx of ggpReferrers) {
           console.log(`      GGParent ${ggpidx} value:`, JSON.stringify(dataObj[ggpidx]).substring(0, 150));
         }
      }
    }
  }
}
test();
