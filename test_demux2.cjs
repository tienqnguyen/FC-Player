const { execSync } = require('child_process');
const fs = require('fs');

execSync('ffmpeg -f lavfi -i sine=frequency=1000:duration=1 -c:a libopus -f webm /tmp/dummy.webm -y', {stdio: 'inherit'});
fs.copyFileSync('/tmp/dummy.webm', '/tmp/dummy2.m4a');

try {
  console.log("Testing with wrong extension:");
  execSync('ffmpeg -i /tmp/dummy2.m4a -f null - -y', {stdio: 'pipe'});
  console.log("Success");
} catch (e) {
  console.log("Failed:\n", e.stderr.toString());
}
