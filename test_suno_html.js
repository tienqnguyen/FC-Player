const id = "203a3534-b57b-42e2-9521-49d0e5be5523";
async function test() {
  try {
    const res = await fetch(`https://suno.com/song/${id}`);
    const text = await res.text();
    const matches = text.match(/https:\/\/[a-z0-9]+\.cloudfront\.net[^\"]+/g);
    console.log("Found cloudfront links:", matches);
    const audioUrlMatch = text.match(/"audio_url":"([^"]+)"/);
    console.log("Found audio_url:", audioUrlMatch ? audioUrlMatch[1] : "No audio_url found");
  } catch (e) {
    console.error(e);
  }
}
test();
