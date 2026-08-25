const fetch = require('node-fetch');
async function test() {
  const params = new URLSearchParams({ keywords: "cat", count: 5, cursor: 0 });
  const res = await fetch("https://tikwm.com/api/feed/search", { method: 'POST', body: params });
  const data = await res.json();
  console.log("Search response:", data.code);
  if (data.data && data.data.videos) {
    const video = data.data.videos[0];
    console.log("Play URL:", video.play);
    
    // Check it
    const vRes = await fetch(video.play, { redirect: "follow" });
    console.log("Play URL status:", vRes.status);
    console.log("Play URL content-type:", vRes.headers.get("content-type"));
  }
}
test();
