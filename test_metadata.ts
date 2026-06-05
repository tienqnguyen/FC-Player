const url = "http://localhost:3000/api/metadata?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ";

fetch(url).then(r => {
  console.log('Status', r.status, r.headers.get('content-type'));
  return r.text();
}).then(console.log).catch(console.error);
