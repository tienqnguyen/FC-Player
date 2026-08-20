const https = require('https');
https.get('https://api.duckduckgo.com/?q=tiktok+search+api+free&format=json', res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(body.substring(0,200)));
});
