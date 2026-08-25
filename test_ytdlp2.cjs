const youtubedl = require('youtube-dl-exec');
async function test() {
  const url = "https://www.tiktok.com/@tiktok/video/7106594312292453678";
  try {
    const info = await youtubedl(url, { dumpSingleJson: true });
    console.log(info.title);
  } catch (e) {
    console.log(e.message);
  }
}
test();
