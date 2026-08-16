const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldOptions = `          const ytdlOptions = {
            dumpSingleJson: true,
            flatPlaylist: true,
            noWarnings: true,
            jsRuntimes: "node",
            noCheckCertificates: true,
          };`;

const newOptions = `          const ytdlOptions: any = {
            dumpSingleJson: true,
            flatPlaylist: true,
            noWarnings: true,
            jsRuntimes: "node",
            noCheckCertificates: true,
            playlistEnd: parseInt(clientCount) || 40,
          };`;

content = content.replace(oldOptions, newOptions);
fs.writeFileSync('server.ts', content);
console.log("Patched yt-dlp options limit.");
