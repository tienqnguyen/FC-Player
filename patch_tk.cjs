const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldBlock = `            // Strategy 3: Direct yt-dlp on TikTok search URL (as requested by user)
      try {
        const searchUrl = \`https://www.tiktok.com/search?q=\${encodeURIComponent(keywords)}\`;
        console.log(\`[TikTok Search] Direct search query via yt-dlp: \${searchUrl}\`);
        const ytdlOptions = {
          dumpSingleJson: true,
          flatPlaylist: true,
          playlistEnd: parseInt(clientCount) || 20,
          noWarnings: true,
        };
        const info = await youtubedl(searchUrl, ytdlOptions);`;

const newBlock = `            // Strategy 3: Direct yt-dlp on mapped TikTok user URL (since yt-dlp does not support /search?q=)
      try {
        const cleanKeyword = keywords.replace(/[^a-zA-Z0-9_]/g, "");
        const searchUrl = \`https://www.tiktok.com/@\${cleanKeyword || "tiktok"}\`;
        console.log(\`[TikTok Search] Direct search query via yt-dlp: \${searchUrl}\`);
        const ytdlOptions = {
          dumpSingleJson: true,
          flatPlaylist: true,
          playlistEnd: parseInt(clientCount) || 20,
          noWarnings: true,
        };
        const info = await youtubedl(searchUrl, ytdlOptions);`;

// Let's normalize spacing
const normalize = (str) => str.replace(/\s+/g, ' ');

const idx = code.indexOf('// Strategy 3: Direct yt-dlp on TikTok search URL');
if (idx === -1) {
  console.log('Not found string');
} else {
  // Regex replace based on structure
  code = code.replace(/const searchUrl = `https:\/\/www\.tiktok\.com\/search\?q=\$\{encodeURIComponent\(keywords\)\}`;/, 'const cleanKeyword = keywords.replace(/[^a-zA-Z0-9_]/g, "");\n        const searchUrl = `https://www.tiktok.com/@${cleanKeyword || "tiktok"}`;');
  code = code.replace(/\/\/ Strategy 3: Direct yt-dlp on TikTok search URL \(as requested by user\)/, '// Strategy 3: Direct yt-dlp on mapped TikTok user URL (since yt-dlp does not support search)');
  fs.writeFileSync('server.ts', code);
  console.log('Replaced via regex');
}
