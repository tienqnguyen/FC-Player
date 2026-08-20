const https = require('https');
const data = new URLSearchParams({ keywords: 'dance', count: 10, cursor: 0, type: 1 }).toString();
const options = {
  hostname: 'www.tikwm.com',
  port: 443,
  path: '/api/feed/search',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': data.length,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://www.tikwm.com',
    'Referer': 'https://www.tikwm.com/'
  }
};
const req = https.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(body.substring(0, 150)));
});
req.write(data);
req.end();
