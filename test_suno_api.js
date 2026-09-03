const id = "203a3534-b57b-42e2-9521-49d0e5be5523";
async function test() {
  try {
    const res = await fetch(`https://studio-api.prod.suno.com/api/external/clip/?ids=${id}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
