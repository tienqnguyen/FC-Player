const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
/async function getDirectMediaUrl\(url: string\): Promise<string> \{[\s\n]*const now = Date\.now\(\);[\s\n]*const cached = directStreamMemoryCache\.get\(url\);[\s\n]*if \(cached && cached\.expiresAt > now\) \{[\s\n]*return cached\.url;[\s\n]*\}/,
`async function getDirectMediaUrl(url: string, forceRefresh: boolean = false): Promise<string> {
  const now = Date.now();
  if (forceRefresh) {
    directStreamMemoryCache.delete(url);
    directStreamInFlightPromises.delete(url);
  } else {
    const cached = directStreamMemoryCache.get(url);
    if (cached && cached.expiresAt > now) {
      return cached.url;
    }
  }`
);

content = content.replace(
/const directUrl = await getDirectMediaUrl\(url\);/,
`const directUrl = await getDirectMediaUrl(url, req.query.force_refresh === "true");`
);

content = content.replace(
/const directUrl = await getDirectMediaUrl\(targetUrl\);/,
`const directUrl = await getDirectMediaUrl(targetUrl, req.query.force_refresh === "true");`
);

content = content.replace(
/finalUrl = await getDirectMediaUrl\(finalUrl\);/,
`finalUrl = await getDirectMediaUrl(finalUrl, req.query.force_refresh === "true");`
);

fs.writeFileSync('server.ts', content);
