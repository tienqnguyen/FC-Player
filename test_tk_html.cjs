const fetch = require("node-fetch");

async function run() {
  const res = await fetch("https://www.tiktok.com/search?q=dance");
  const html = await res.text();
  const match = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)<\/script>/);
  if (match) {
    const data = JSON.parse(match[1]);
    console.log(Object.keys(data.__DEFAULT_SCOPE__));
  }
}
run();
