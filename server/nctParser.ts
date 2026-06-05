import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

// Unflatten Nuxt 3 devalue array
export function unflattenNuxtData(dataObj: any[]): any[] {
  function hydrate(index: any, seen = new Map()): any {
    if (typeof index !== "number") return index;
    if (seen.has(index)) return seen.get(index);
    
    const val = dataObj[index];
    if (val === null || val === undefined) return val;
    if (typeof val !== "object") {
      seen.set(index, val);
      return val;
    }

    if (Array.isArray(val)) {
      const res: any[] = [];
      seen.set(index, res);
      for (const item of val) {
        res.push(hydrate(item, seen));
      }
      return res;
    } else {
      const res: any = {};
      seen.set(index, res);
      for (const [key, item] of Object.entries(val)) {
        res[key] = hydrate(item, seen);
      }
      return res;
    }
  }

  const songsMap = new Map<string, any>();
  for (let i = 0; i < dataObj.length; i++) {
    const item = hydrate(i);
    if (item && typeof item === "object" && !Array.isArray(item)) {
      if (item.name && item.artistName && item.streamURL && item.key) {
        songsMap.set(item.key, item);
      }
    }
  }

  return Array.from(songsMap.values()).map(s => {
    // Quality 128kbps is usually the first or standard
    const q128 = s.streamURL.find((q: any) => q.type === "128") || s.streamURL[0];
    const directAudioUrl = q128 ? q128.stream : "";
    
    // Wrap with proxy stream endpoint to bypass region blocks and allow CORS playback
    const proxiedAudioUrl = directAudioUrl ? `/api/proxy-stream?url=${encodeURIComponent(directAudioUrl)}` : "";
    
    return {
      id: "nct_" + s.key,
      title: s.name,
      author: s.artistName,
      duration: s.duration || 180,
      cover: s.image || s.bgImage || "https://image-cdn.nct.vn/playlist/default.jpg",
      audioUrl: proxiedAudioUrl,
      originalUrl: `https://www.nhaccuatui.com/song/${s.key}.html`,
      qualities: s.streamURL.map((q: any) => ({
        quality: q.typeUI || q.type,
        url: q.stream ? `/api/proxy-stream?url=${encodeURIComponent(q.stream)}` : "",
        downloadUrl: q.download,
        vip: !!q.onlyVIP
      }))
    };
  });
}

// Extract __NUXT_DATA__ JSON from HTML text and parse it
export function parseNctHtml(htmlText: string): { title: string; cover: string; description: string; songs: any[] } {
  // Extract Metadata using fallback regexes
  const titleMatch = htmlText.match(/<title>(.*?)<\/title>/i);
  let title = titleMatch ? titleMatch[1].trim() : "NhacCuaTui Playlist";
  // Clean title suffix
  title = title.replace(/\s*-\s*nhaccuatui\s*$/i, "")
               .replace(/\s*-\s*mp3 download\s*\|\s*lyric\s*-\s*nhaccuatui\s*$/i, "")
               .replace(/\s*-\s*nghe nhạc\s*mới\s*hot\s*nhất\s*$/i, "")
               .trim();

  const coverMatch = htmlText.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) || 
                     htmlText.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:image["']/i);
  const cover = coverMatch ? coverMatch[1].trim() : "https://image-cdn.nct.vn/playlist/default.jpg";

  const descMatch = htmlText.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) ||
                    htmlText.match(/<meta\s+content=["'](.*?)["']\s+name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : "";

  // Extract __NUXT_DATA__
  const scriptRegex = /<script\s+[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i;
  const match = scriptRegex.exec(htmlText);
  
  let dataObj: any[] = [];
  if (match) {
    try {
      const dataText = match[1].trim();
      dataObj = JSON.parse(dataText);
    } catch (e: any) {
      console.error("[NCT Parser] Failed parsing __NUXT_DATA__ script block:", e.message);
    }
  }

  // Fallback: If no script tag matched, attempt to parse the entire input as a raw JSON array
  if (!dataObj || dataObj.length === 0) {
    const trimmed = htmlText.trim();
    if (trimmed.startsWith("[")) {
      try {
        dataObj = JSON.parse(trimmed);
      } catch (err: any) {
        console.error("[NCT Parser] Failed parsing raw input as direct JSON:", err.message);
      }
    }
    
    // Fallback: Extract the first array block found in the text using bracket counting
    if (!dataObj || dataObj.length === 0) {
      const firstBracket = trimmed.indexOf("[");
      const lastBracket = trimmed.lastIndexOf("]");
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        const potentialJson = trimmed.substring(firstBracket, lastBracket + 1);
        try {
          dataObj = JSON.parse(potentialJson);
        } catch (e: any) {
          console.error("[NCT Parser] Failed parsing extracted bracket-bounded substring as JSON:", e.message);
        }
      }
    }
  }

  if (!dataObj || !Array.isArray(dataObj) || dataObj.length === 0) {
    throw new Error("Could not find a valid __NUXT_DATA__ JSON array in the provided HTML page source or pasted data.");
  }

  const songs = unflattenNuxtData(dataObj);
  return { title, cover, description, songs };
}

// Resolve short URLs like j.nct.vn to the full nhaccuatui.com URL
export async function expandNctUrl(url: string): Promise<string> {
  if (!url.includes("j.nct.vn") && !url.includes("nct.vn")) {
    return url;
  }
  try {
    console.log(`[NCT Expand] Resolving shortened URL: ${url}`);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    
    const location = res.headers.get("location");
    if (location) {
      // Handle relative vs absolute paths
      const targetUrl = location.startsWith("/") ? `https://www.nhaccuatui.com${location}` : location;
      console.log(`[NCT Expand] Resolved to: ${targetUrl}`);
      return targetUrl;
    }
  } catch (err: any) {
    console.error("[NCT Expand] Error parsing location, trying GET redirect fallback...", err.message);
  }
  
  // Fallback GET request to fetch the actual redirected URL info
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    console.log(`[NCT Expand] Followed redirect to: ${res.url}`);
    return res.url;
  } catch (err: any) {
    console.warn("[NCT Expand] Failed to follow redirects automatically, using raw URL:", err.message);
  }
  return url;
}

// Bypassing geoblocking with fast direct attempt and high speed VN Proxy Race fallback
export async function fetchNctPlaylistWithProxyRace(rawUrl: string): Promise<string> {
  const nctUrl = await expandNctUrl(rawUrl);
  // 1. Try DIRECT fetch first (super-fast, avoids proxy overhead if not geoblocked)
  console.log(`[NCT Parser] Trying direct fetch first for URL: ${nctUrl}`);
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 6000); // 6s timeout for direct
    const res = await fetch(nctUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });
    clearTimeout(id);
    if (res.status === 200) {
      if (!res.url.endsWith("www.nhaccuatui.com/") && !res.url.endsWith("www.nhaccuatui.com")) {
        const html = await res.text();
        if (html.includes("__NUXT_DATA__")) {
          console.log(`[NCT Parser] Direct fetch SUCCESS!`);
          return html;
        }
      }
    }
    console.log(`[NCT Parser] Direct fetch was geoblocked or returned invalid results. Falling back to VN Proxy Race.`);
  } catch (directError: any) {
    console.log(`[NCT Parser] Direct fetch failed or timed out: ${directError.message}. Falling back to VN Proxy Race.`);
  }

  // 2. Fall back to proxy race if direct fails
  const proxyListUrl = "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=8000&country=VN&ssl=all&anonymity=all";
  
  console.log("[NCT Proxy Race] Fetching fresh VN proxies...");
  const pRes = await fetch(proxyListUrl);
  const pText = await pRes.text();
  const proxies = pText.trim().split("\n").map(l => l.trim()).filter(Boolean);
  
  if (proxies.length === 0) {
    throw new Error("No Vietnamese proxies available via list providers.");
  }

  const selectedProxies = proxies.slice(0, 15);
  console.log(`[NCT Proxy Race] Racing with ${selectedProxies.length} proxies...`);

  // We write an individual proxy runner
  const fetchWithProxy = async (proxy: string): Promise<string> => {
    const agent = new HttpsProxyAgent(`http://${proxy}`);
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 6000); // 6s timeout max per request

    try {
      const res = await fetch(nctUrl, {
        agent,
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });
      clearTimeout(id);

      if (res.status === 200) {
        // Confirm we didn't get redirected to the index page or block page
        if (!res.url.endsWith("www.nhaccuatui.com/") && !res.url.endsWith("www.nhaccuatui.com")) {
          const html = await res.text();
          if (html.includes("__NUXT_DATA__")) {
             console.log(`[NCT Proxy Race] Proxy SUCCESS win: http://${proxy}`);
             return html;
          }
        }
      }
      throw new Error(`Incompatible response or geoblocked redirect at ${res.url}`);
    } catch (e: any) {
      clearTimeout(id);
      throw e;
    }
  };

  // Run the race
  const promises = selectedProxies.map(proxy => fetchWithProxy(proxy));
  
  try {
    // If ANY of the proxies returns successfully, it resolves immediately!
    const winningHtml = await Promise.any(promises);
    return winningHtml;
  } catch (error) {
    console.error("[NCT Proxy Race] All parallel proxies in the race failed.");
    throw new Error("All Vietnamese proxy servers in the race timed out or failed to connect.");
  }
}
