const fetch = require('node-fetch');
async function test() {
  const params = new URLSearchParams({ keywords: "cat", count: 1, cursor: 0 });
  const response = await fetch("https://tikwm.com/api/feed/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: params.toString(),
  });
  const data = await response.json();
  console.log(data.data.videos[0].play);
}
test();
