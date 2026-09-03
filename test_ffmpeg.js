const { spawn } = require('child_process');
const fs = require('fs');
fs.writeFileSync('/tmp/test.txt', 'dummy');
const subprocess = spawn('ffmpeg', ['-i', '/tmp/test.txt', '-f', 'mp3', '-']);
subprocess.stderr.on('data', d => console.log('stderr:', d.toString()));
subprocess.stdout.on('data', d => console.log('stdout:', d.length));
