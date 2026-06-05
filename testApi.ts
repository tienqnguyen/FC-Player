// @ts-ignore
import nct from "nhaccuatui-api";

async function test() {
  try {
    const playlistKey = "lQ61iLbyjGq7";
    console.log("fetching playlist detail for key:", playlistKey);
    const data = await nct.getPlaylist(playlistKey);
    console.log("Response Status:", data.status);
    console.log("Response Keys:", Object.keys(data));
    console.log("Response Data:", JSON.stringify(data, null, 2).substring(0, 2000));
  } catch (e: any) {
    console.error("API error:", e.message || e);
  }
}
test();
