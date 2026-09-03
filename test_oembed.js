const id = "2feba957-e976-4588-a734-9b42682e855f";
async function test() {
  try {
    let res = await fetch(`https://studio-api.prod.suno.com/api/oembed?url=https%3A%2F%2Fsuno.com%2Fsong%2F${id}`);
    console.log("Status 1:", res.status);
    if(res.ok) console.log(await res.json());
  } catch(e) { console.error(e) }
}
test();
