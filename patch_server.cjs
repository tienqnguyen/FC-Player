const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const cacheLogic = `
// In-memory cache for Pixabay/Freesound search results (48 hours)
const sfxCache = new Map<string, { timestamp: number, data: any }>();
const CACHE_DURATION_MS = 48 * 60 * 60 * 1000;

app.get("/api/pixabay/search", async (req, res) => {
    try {
      const q = (req.query.q as string) || "rain";
      const p = (req.query.p as string) || "1";
      const cacheKey = \`\${q}_\${p}\`;
      
      if (sfxCache.has(cacheKey)) {
          const cached = sfxCache.get(cacheKey)!;
          if (Date.now() - cached.timestamp < CACHE_DURATION_MS) {
              return res.json({ success: true, data: cached.data, cached: true });
          }
      }

      const pixabayUrl = \`https://pixabay.com/sound-effects/search/\${encodeURIComponent(q)}/?order=trending&pagi=\${p}\`;
      let html = "";
      let isFreesoundFallback = false;

      try {
        // Try direct fetch first
        const directRes = await fetch(pixabayUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });
        const directHtml = await directRes.text();
        if (directHtml.includes("window.__BOOTSTRAP__")) {
            html = directHtml;
        } else {
            // Try proxy
            const proxyUrl = \`https://api.allorigins.win/get?url=\${encodeURIComponent(pixabayUrl)}\`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            if (data && data.contents && data.contents.includes("window.__BOOTSTRAP__")) {
              html = data.contents;
            }
        }
      } catch (e) {
        console.warn("Pixabay fetch failed, falling back to freesound", e);
        isFreesoundFallback = true;
      }

      if (!html) {
        isFreesoundFallback = true;
      }

      if (isFreesoundFallback) {
        // Fallback to Freesound since Pixabay aggressively blocks proxies via Cloudflare
        const freeSoundUrl = \`https://freesound.org/search/?q=\${encodeURIComponent(q)}&page=\${p}\`;
`;

content = content.replace(/  app\.get\("\/api\/pixabay\/search", async \(req, res\) => \{[\s\S]*?\/\/ Fallback to Freesound since Pixabay aggressively blocks proxies via Cloudflare\n        const freeSoundUrl = \`https:\/\/freesound\.org\/search\/\?q=\$\{encodeURIComponent\(q\)\}&page=\$\{p\}\`;/, cacheLogic);

// Add the cache set before res.json
content = content.replace(/res\.json\(\{ success: true, data: results \}\);/g, `sfxCache.set(cacheKey, { timestamp: Date.now(), data: results });\n      res.json({ success: true, data: results });`);

fs.writeFileSync('server.ts', content);
