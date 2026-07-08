import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();

app.get("/api/tkaraoke/search", async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: "No query provided" });
    
    const url = `https://lyric.tkaraoke.com/s.tim?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0",
        }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const songs: any[] = [];
    const seenUrls = new Set<string>();
    
    $("a").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href.match(/\/\d+\/[\w_]+\.html$/)) {
          const title = $(el).text().trim();
          const fullUrl = `https://lyric.tkaraoke.com${href}`;
          if (!seenUrls.has(fullUrl)) {
              seenUrls.add(fullUrl);
              songs.push({
                  title: title,
                  url: fullUrl
              });
          }
      }
    });
    
    res.json({ success: true, videos: songs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
