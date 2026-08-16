import fetch from "node-fetch";

async function run() {
  const params = new URLSearchParams({
    keywords: "dance",
    count: "10",
    cursor: "0",
    type: "1",
  });
  const response = await fetch("https://www.tikwm.com/api/feed/search", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await response.text();
  console.log("Response text:", text.substring(0, 100));
}
run();
