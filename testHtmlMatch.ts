import fetch from "node-fetch";
import https from "node:https";

async function test() {
  const url = "https://m.nhaccuatui.com/playlist/study-music-playlist-for-deep-focus-study-music-project.lQ61iLbyjGq7.html";
  console.log("fetching mobile nhaccuatui url with rejectUnauthorized false:", url);
  
  const agent = new https.Agent({
    rejectUnauthorized: false
  });

  try {
    const res = await fetch(url, {
      agent,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
      }
    });
    console.log("Response status:", res.status);
    console.log("Response url:", res.url);
    const htmlText = await res.text();
    
    const titleMatch = htmlText.match(/<title>(.*?)<\/title>/i);
    console.log("Title of fetched page:", titleMatch ? titleMatch[1] : "NONE");
    console.log("HTML starting length:", htmlText.length);
    console.log("Has study-music inside html?", htmlText.toLowerCase().includes("study-music"));
    console.log("Has study-music-playlist inside html?", htmlText.toLowerCase().includes("study-music-playlist"));
    console.log("Has xmlURL or player config inside html?", htmlText.includes("xml") || htmlText.includes("player"));
  } catch (e: any) {
    console.error("error fetching:", e.message);
  }
}
test();
