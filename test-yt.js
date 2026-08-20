const youtubedl = require('youtube-dl-exec');
youtubedl('https://www.tiktok.com/tag/trending', { dumpSingleJson: true, flatPlaylist: true, playlistEnd: 5 })
  .then(info => console.log("Success! Items:", info.entries ? info.entries.length : 0))
  .catch(err => console.error("Error:", err.message));
