import re

with open('server.ts', 'r') as f:
    content = f.read()

replacement = """async function getDirectMediaUrl(url: string): Promise<string> {
  const now = Date.now();
  const cached = directStreamMemoryCache.get(url);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  let inFlightPromise = directStreamInFlightPromises.get(url);
  if (!inFlightPromise) {
    inFlightPromise = (async () => {
      try {
        if (url.includes("nhaccuatui.com") || url.includes("nct.vn")) {
          const rawHtml = await fetchNctPlaylistWithProxyRace(url);
          const parsedData = parseNctHtml(rawHtml);
          if (parsedData.songs && parsedData.songs.length > 0) {
            const firstSong = parsedData.songs[0];
            const directAudioUrl = firstSong.audioUrl || firstSong.originalUrl || url;
            directStreamMemoryCache.set(url, { url: directAudioUrl, expiresAt: now + 45 * 60 * 1000 });
            return directAudioUrl;
          }
        }

        const ytdlOptions: any = {"""

content = re.sub(
    r'async function getDirectMediaUrl\(url: string\): Promise<string> \{\n  const now = Date\.now\(\);\n  const cached = directStreamMemoryCache\.get\(url\);\n  if \(cached && cached\.expiresAt > now\) \{\n    return cached\.url;\n  \}\n\n  let inFlightPromise = directStreamInFlightPromises\.get\(url\);\n  if \(!inFlightPromise\) \{\n    inFlightPromise = \(async \(\) => \{\n      try \{\n        const ytdlOptions: any = \{',
    replacement,
    content,
    flags=re.MULTILINE
)

with open('server.ts', 'w') as f:
    f.write(content)
