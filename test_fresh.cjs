const fetch = require('node-fetch');
async function test() {
  const res = await fetch("https://www.tikwm.com/api/?url=https://www.tiktok.com/@tiktok/video/7106594312292453678");
  const data = await res.json();
  console.log(data);
  if (data.data && data.data.play) {
    const playRes = await fetch(data.data.play);
    console.log("Play status:", playRes.status);
  }
}
test();
