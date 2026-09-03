const { execSync } = require('child_process');
const fs = require('fs');

// Generate a dummy ogg/opus file
execSync('ffmpeg -f lavfi -i sine=frequency=1000:duration=1 -c:a libopus -f ogg /tmp/dummy.ogg -y', {stdio: 'inherit'});

// Rename it to .m4a
fs.copyFileSync('/tmp/dummy.ogg', '/tmp/dummy.m4a');

try {
  // Test if ffmpeg fails when extension is wrong
  console.log("Testing with wrong extension:");
  execSync('ffmpeg -i /tmp/dummy.m4a -f null - -y', {stdio: 'pipe'});
  console.log("Success with wrong extension");
} catch (e) {
  console.log("Failed with wrong extension:\n", e.stderr.toString());
}

try {
  // Test without extension
  console.log("\nTesting without extension:");
  execSync('ffmpeg -i /tmp/dummy.ogg -f null - -y', {stdio: 'pipe'});
  console.log("Success with correct extension");
} catch (e) {
  console.log("Failed with correct extension:\n", e.stderr.toString());
}
