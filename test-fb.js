const { default: youtubedl } = require('youtube-dl-exec');
async function test() {
  try {
    const info = await youtubedl('https://www.facebook.com/watch/?v=10153231379946729', {
      dumpSingleJson: true,
      noWarnings: true,
      noPlaylist: true,
      f: "ba[ext=m4a]/b[ext=mp4]/ba/b/best",
      jsRuntimes: "node",
      noCheckCertificates: true,
    });
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
