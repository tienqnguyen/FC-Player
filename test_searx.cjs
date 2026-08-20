const https = require('https');
https.get('https://searx.be/search?q=site:tiktok.com/video/+dance&format=json', res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log(data.results ? data.results.map(r=>r.url).slice(0,5) : 'no results');
    } catch(e) { console.log("JSON error", e); }
  });
});
