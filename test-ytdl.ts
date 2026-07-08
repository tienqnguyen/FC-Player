import youtubedl from "youtube-dl-exec";
async function test() {
  try {
    const info = await youtubedl("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      dumpSingleJson: true,
      noWarnings: true,
      jsRuntimes: "node"
    });
    console.log("SUCCESS");
  } catch (e) {
    console.log("FAILED:", e.message);
  }
}
test();
