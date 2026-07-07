import fetch from "node-fetch";

async function run() {
  const url = "http://localhost:3000/api/stream?url=https://www.youtube.com/watch?v=jfKfPfyJRdk";
  const res = await fetch(url);
  console.log(res.status);
}
run();
