const fetch = require("node-fetch");
const cheerio = require("cheerio");

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
  
  console.log($('a[href*=".html"]').slice(0, 10).map((i, el) => ({ title: $(el).text().trim(), href: $(el).attr('href') })).get());
}
searchTKaraoke("chuyen tinh mong manh");
