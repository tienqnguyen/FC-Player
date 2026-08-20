const https = require('https');
https.get('https://api.allorigins.win/get?url=https%3A%2F%2Fwww.tiktok.com%2Fsearch%3Fq%3Ddance', res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log(data.contents ? data.contents.substring(0,200) : 'none');
    } catch(e) { console.log(e); }
  });
});
