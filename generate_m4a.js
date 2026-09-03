const { execSync } = require('child_process');
execSync('ffmpeg -f lavfi -i sine=frequency=1000:duration=1 -c:a aac /tmp/test.m4a -y');
execSync('cp /tmp/test.m4a /tmp/test_noext');
