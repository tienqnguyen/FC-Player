import { fetchNctPlaylistWithProxyRace, parseNctHtml } from "./server/nctParser";

async function run() {
  const url = "https://www.nhaccuatui.com/playlist/loi-yeu-ngay-truoc-vuong-tuan-vu.XmGz50fB7TfO.html";
  try {
    const html = await fetchNctPlaylistWithProxyRace(url);
    const parsed = parseNctHtml(html);
    console.log(`Title: ${parsed.title}, Cover: ${parsed.cover}`);
    parsed.songs.forEach(s => {
      console.log(`- ${s.title} (${s.audioUrl})`);
    });
  } catch (e: any) {
    console.error(e.message);
  }
}
run();
