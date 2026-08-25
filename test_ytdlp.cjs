const { spawn } = require('child_process');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
async function test() {
  const url = "https://www.tiktok.com/@khaby.lame/video/7161727838561733894";
  const ytDlpArgs = [
    "-f",
    "b/best",
    "-o",
    "-",
    url,
  ];
  const subprocess = spawn(
    youtubedl.constants.YOUTUBE_DL_PATH,
    ytDlpArgs,
  );
  subprocess.stdout.on('data', (chunk) => {
    console.log("Got chunk of size", chunk.length);
    subprocess.kill();
  });
  subprocess.stderr.on('data', (d) => console.log("ERR", d.toString()));
}
test();
