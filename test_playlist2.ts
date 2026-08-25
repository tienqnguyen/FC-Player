import { fetchNctPlaylistWithProxyRace, parseNctHtml } from "./server/nctParser";
async function run() {
  const url = "https://www.nhaccuatui.com/playlist/8b8lO7A3blOc";
  const html = await fetchNctPlaylistWithProxyRace(url);
  const parsed = parseNctHtml(html);
  if (parsed.songs.length > 0) {
    console.log(`First song audioUrl: ${parsed.songs[0].audioUrl}`);
    console.log(`First song qualities:`, parsed.songs[0].qualities);
  }
}
run();
