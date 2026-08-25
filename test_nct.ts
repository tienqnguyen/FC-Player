import { fetchNctPlaylistWithProxyRace, parseNctHtml } from "./server/nctParser";

async function run() {
  try {
    const rawHtml = await fetchNctPlaylistWithProxyRace("https://www.nhaccuatui.com/song/xLLyzXlyrRLa.html");
    const parsedData = parseNctHtml(rawHtml);
    console.log("Success:", parsedData.title);
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}
run();
