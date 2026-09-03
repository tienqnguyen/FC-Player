const fs = require('fs');
const { spawnSync } = require('child_process');

async function run() {
  const url = "https://d2lwuy8qc234o3.cloudfront.net/1/clip/203a3534-b57b-42e2-9521-49d0e5be5523.m4a";
  const fetchRes = await fetch(url);
  const buffer = await fetchRes.arrayBuffer();
  
  // Write the full file
  fs.writeFileSync('full.m4a', Buffer.from(buffer));
  
  // Truncate it to simulate incomplete download (cut off last 10%)
  const truncatedBuffer = buffer.slice(0, Math.floor(buffer.byteLength * 0.9));
  fs.writeFileSync('truncated.m4a', Buffer.from(truncatedBuffer));
  
  // Try to convert the truncated file
  const result = spawnSync("ffmpeg", ["-i", "truncated.m4a", "-y", "output.mp3"]);
  console.log("Standard conversion stderr:", result.stderr.toString());
  
  // Is there any ffmpeg trick to read truncated m4a? 
  // MP4 files must have the moov atom. If it's at the end, and truncated, it's dead.
}
run();
