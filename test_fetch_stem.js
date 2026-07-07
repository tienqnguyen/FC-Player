import fetch from "node-fetch";

async function run() {
  const url = "http://localhost:3000/api/proxy-stream?url=" + encodeURIComponent("https://peachjed-stemmix.hf.space/file=/tmp/gradio/test.wav");
  const res = await fetch(url);
  console.log(res.status, res.headers.get('content-type'));
}
run();
