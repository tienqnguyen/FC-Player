const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'const newSongs = videos.filter((v: any) => v.music || v.play || v.music_info).map((v: any) => {',
  'const newSongs = videos.filter((v: any) => v.music || v.play || v.music_info || v.audioUrl).map((v: any) => {'
);

content = content.replace(
  'const rawAudioUrl = v.music || v.play || v.music_info?.play;',
  'const rawAudioUrl = v.audioUrl || v.music || v.play || v.music_info?.play;'
);

content = content.replace(
  'const proxiedAudioUrl = rawAudioUrl && rawAudioUrl.startsWith("http") ? \`/api/proxy-stream?url=\${encodeURIComponent(rawAudioUrl)}\` : rawAudioUrl;',
  'const proxiedAudioUrl = rawAudioUrl && rawAudioUrl.startsWith("http") && !rawAudioUrl.includes("/api/stream") ? `/api/proxy-stream?url=${encodeURIComponent(rawAudioUrl)}` : rawAudioUrl;'
);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched filter in App.tsx");
