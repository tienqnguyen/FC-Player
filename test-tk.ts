import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const url = `https://lyric.tkaraoke.com/s.tim?q=my-tam&t=11&p=2`;
  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });
  
  const html = response.data;
  const $ = cheerio.load(html);
  
  const videos: any[] = [];
  $('.div-result-item').each((i: number, el: any) => {
    const titleEl = $(el).find('.h4-title-song a');
    const title = titleEl.text().trim();
    const tkLink = 'https://lyric.tkaraoke.com' + titleEl.attr('href');
    const id = titleEl.attr('href')?.split('/')[1] || `tk-${i}`;
    
    const author = $(el).find('.p-author a').text().trim();
    const singer = $(el).find('.p-singer a').text().trim() || "Unknown";
    
    videos.push({
      id,
      title,
      author: singer + (author ? ` (Composer: ${author})` : ''),
      originalUrl: tkLink
    });
  });
  console.log(videos);
}
test();
