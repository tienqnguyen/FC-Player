const id = "203a3534-b57b-42e2-9521-49d0e5be5523";
async function test() {
  try {
    const res = await fetch(`https://suno.com/song/${id}`);
    const text = await res.text();
    // Match something like https://*.cloudfront.net/1/clip/<id>.m4a
    // or https://*.cloudfront.net/....m4a
    const regex = new RegExp(`https:\/\/[a-z0-9]+\\.cloudfront\\.net\/[^"]*${id}\\.m4a`, 'g');
    const matches = text.match(regex);
    console.log("Regex matches:", matches);
  } catch (e) {
    console.error(e);
  }
}
test();
