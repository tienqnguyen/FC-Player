const id = "203a3534-b57b-42e2-9521-49d0e5be5523";
async function test() {
  const urls = [
    `https://cdn1.suno.ai/${id}.m4a`,
    `https://cdn1.suno.ai/${id}.mp4`,
    `https://cdn1.suno.ai/${id}.mp3`
  ];
  for (const url of urls) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://suno.com/",
        "Accept": "*/*"
      }
    });
    console.log(url, "=>", res.status);
  }
}
test();
