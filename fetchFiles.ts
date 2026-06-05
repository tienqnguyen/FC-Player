import fetch from "node-fetch";

async function test() {
  try {
    const res = await fetch("https://unpkg.com/nhaccuatui-api@1.0.0/?meta");
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (e: any) {
    console.error(e);
  }
}
test();
