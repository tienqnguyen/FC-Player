const cheerio = require('cheerio');
fetch('https://www.nhaccuatui.com/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
})
.then(r => r.text())
.then(html => {
    const $ = cheerio.load(html);
    const albums = [];
    $('a[href^="/playlist/"]').each((i, el) => {
        const href = $(el).attr('href');
        const title = $(el).attr('title') || $(el).find('img').attr('alt') || $(el).text().trim();
        const img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
        if (href && title) {
            albums.push({ href, title, img });
        }
    });
    console.log('Albums found via HTML scraping:', albums.length);
    console.log(albums.slice(0, 10));
});
