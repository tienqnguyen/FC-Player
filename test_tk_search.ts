import fetch from "node-fetch";
async function run() {
  const url = "http://localhost:3000/api/tiktok/search?q=funny";
  const res = await fetch(url);
  const data = await res.json();
  console.log("Items for funny:", data.videos ? data.videos.length : data);
}
run();
