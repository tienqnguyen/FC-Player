const fetch = require('node-fetch');
async function test() {
  const url = "https://tikwm.com/video/media/play/7161727838561733894.mp4";
  const res = await fetch(url, { headers: { "Referer": "https://www.tikwm.com/" }, redirect: "follow" });
  console.log("Status:", res.status);
  console.log("Headers:", res.headers.raw());
}
test();
