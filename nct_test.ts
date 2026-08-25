import { expandNctUrl } from "./server/nctParser";

async function test(url: string) {
    const nctUrl = await expandNctUrl(url);
    console.log("expanded:", nctUrl);
    
    // strip .html
    const fixedUrl = nctUrl.replace(/\.html$/, "");
    console.log("fixed:", fixedUrl);
    
    const res = await fetch(fixedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });
    
    const html = await res.text();
    console.log("includes NUXT_DATA?", html.includes("__NUXT_DATA__"));
}

test("https://www.nhaccuatui.com/song/m4OopfbooS9C.html");
