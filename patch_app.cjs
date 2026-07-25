const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const getSafeFilename = `
  const getSafeFilename = (title) => {
    if (!title) return "audio";
    let clean = title.replace(/[^a-zA-Z0-9_\\-\\s]/g, "").trim();
    if (clean.length > 30) {
      clean = clean.substring(0, 30).trim();
    }
    return clean || "audio";
  };
`;

content = content.replace('  const downloadAudio = async (e: React.MouseEvent, song: any) => {', getSafeFilename + '\n  const downloadAudio = async (e: React.MouseEvent, song: any) => {');

content = content.replace(/link\.download = \`\$\{song\.title \|\| "audio"\}\.m4a\`;/g, 'link.download = `${getSafeFilename(song.title)}.m4a`;');
content = content.replace(/downloadUrl = \`\/api\/download\?url=\$\{encodeURIComponent\(targetUrl\)\}&title=\$\{encodeURIComponent\(song\.title \|\| "audio"\)\}\`;/g, 'downloadUrl = `/api/download?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(getSafeFilename(song.title))}`;');
content = content.replace(/a\.download = \`HD_Enhanced_\$\{fileName\?\.replace\(\/\\\\\.\[\^\/\\.\]\+\$\/, ""\) \|\| "audio"\}\.wav\`;/g, 'a.download = `HD_Enhanced_${getSafeFilename(fileName)}.wav`;');

fs.writeFileSync('src/App.tsx', content);
