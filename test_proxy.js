import fetch from "node-fetch";

async function run() {
  const url = "https://peachjed-stemmix.hf.space";
  console.log("Fetching...", url);
  const res = await fetch("http://localhost:3000/api/proxy-stream?url=" + encodeURIComponent(url));
  console.log(res.status, res.headers.get("content-type"));
}

run();
