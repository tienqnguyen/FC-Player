import fs from "node:fs/promises";

async function test() {
  const content = await fs.readFile("hydrated_root.json", "utf-8");
  const root = JSON.parse(content);

  const data = root.data;
  console.log("data keys:", Object.keys(data));

  const indexDataDetail = data.indexDataDetail;
  console.log("indexDataDetail keys:", indexDataDetail ? Object.keys(indexDataDetail) : "NONE");

  if (indexDataDetail) {
    console.log("indexDataDetail title:", indexDataDetail.title);
    console.log("indexDataDetail total songs:", indexDataDetail.total);
    console.log("list array length:", indexDataDetail.list?.length);
    if (indexDataDetail.list && indexDataDetail.list.length > 0) {
      console.log("Sample song in list[0]:", JSON.stringify(indexDataDetail.list[0], null, 2));
    }
  }
}
test();
