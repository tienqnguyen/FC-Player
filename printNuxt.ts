import fetch from "node-fetch";
import fs from "node:fs/promises";

async function test() {
  try {
    const url = "https://www.nhaccuatui.com/playlist/study-music-playlist-for-deep-focus-study-music-project.lQ61iLbyjGq7.html";
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const htmlText = await res.text();
    
    // Extract script id="__NUXT_DATA__" type="application/json"
    const regex = /<script\s+[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i;
    const match = regex.exec(htmlText);
    if (!match) {
      console.log("No id=__NUXT_DATA__ script found");
      return;
    }
    const dataText = match[1].trim();
    const dataObj = JSON.parse(dataText);
    console.log("Type of NUXT_DATA:", typeof dataObj);
    console.log("IsArray:", Array.isArray(dataObj));
    console.log("Length of Array:", dataObj.length);
    
    await fs.writeFile("nuxt_data.json", JSON.stringify(dataObj, null, 2));
    console.log("Successfully wrote nuxt_data.json");
  } catch (e: any) {
    console.error(e);
  }
}
test();
