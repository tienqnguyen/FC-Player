import * as cheerio from "cheerio";

async function searchTKaraoke(q) {
  const url = `https://lyric.tkaraoke.com/s.aspx?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const results = [];
  $('a[href*=".html"]').each((_, el) => {
    const href = $(el).attr('href');
    const title = $(el).text().trim();
    if (href && title && !href.includes('playlist') && !href.includes('singer')) {
        results.push({ title, href });
    }
  });
  
  console.log(results.slice(0, 10));
}
searchTKaraoke("chuyen tinh mong manh");
