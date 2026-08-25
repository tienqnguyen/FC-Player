async function test(url: string) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });
    
    const html = await res.text();
    console.log("includes NUXT_DATA?", html.includes("__NUXT_DATA__"));
}

test("https://www.nhaccuatui.com/song/m4OopfbooS9C.html");
