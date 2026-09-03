const id = "203a3534-b57b-42e2-9521-49d0e5be5523";
async function test() {
  const urls = [
    `https://cdn1.suno.ai/${id}.mp4`,
    `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${id}.m4a`
  ];
  for (const url of urls) {
    const res = await fetch(url);
    console.log(url, "=>", res.status);
  }
}
test();
