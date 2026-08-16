const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /                \{\/\* TikTok Albums are currently hidden due to API issues \*\/\}\n                \{false && \(\n                <div className="grid grid-cols-2 gap-3 items-start content-start">\n              \{allAlbums\.map\(\(alb\) => \{/g,
  `                <div className="grid grid-cols-2 gap-3 items-start content-start">
              {allAlbums.map((alb) => {`
);

content = content.replace(
  /                \);\n              \}\)\}\n              <\/div>\n              \)\}\n              \{\/\* Other Fetched Tracks \(YouTube, Facebook, NCT, or custom URLs\) \*\/\}/g,
  `                );
              })}
              </div>

              {/* Other Fetched Tracks (YouTube, Facebook, NCT, or custom URLs) */}`
);

fs.writeFileSync('src/App.tsx', content);
console.log("Restored TikTok Albums");
