const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'const info = await youtubedl(profileUrl, ytdlOptions);',
  'const info = await youtubedl(profileUrl, ytdlOptions) as any;'
);

content = content.replace(
  'const info = await youtubedl(query, ytdlOptions);',
  'const info = await youtubedl(query, ytdlOptions) as any;'
);

fs.writeFileSync('server.ts', content);
console.log("Fixed server.ts");
