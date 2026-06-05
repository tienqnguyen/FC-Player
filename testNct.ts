import fetch from "node-fetch";

async function test() {
  try {
    const url = "https://www.nhaccuatui.com/playlist/study-music-playlist-for-deep-focus-study-music-project.lQ61iLbyjGq7.html";
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const htmlText = await res.text();
    
    // Find all `<script>` tags contents
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(htmlText)) !== null) {
      const scriptContent = match[1];
      if (scriptContent.includes("indexDataDetail")) {
        console.log("--- Found Script with indexDataDetail ---");
        console.log("Length of script:", scriptContent.length);
        console.log("Beginning of script:", scriptContent.trim().substring(0, 1000));
        console.log("Ending of script:", scriptContent.trim().substring(scriptContent.trim().length - 1000));
      }
    }
  } catch (e: any) {
    console.error(e);
  }
}
test();
