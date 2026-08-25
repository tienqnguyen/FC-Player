import { fetchNctPlaylistWithProxyRace, parseNctHtml } from "./server/nctParser";

async function run() {
  const url = "https://www.nhaccuatui.com/playlist/8b8lO7A3blOc";
  try {
    const html = await fetchNctPlaylistWithProxyRace(url);
    const parsed = parseNctHtml(html);
    console.log(`Title: ${parsed.title}`);
    console.log(`Songs: ${parsed.songs.length}`);
    if (parsed.songs.length > 0) {
      console.log(`First song title: ${parsed.songs[0].title}`);
      console.log(`First song originalUrl: ${parsed.songs[0].originalUrl}`);
    }
  } catch (e: any) {
    console.error(e.message);
  }
}
run();
