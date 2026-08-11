const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Hide allAlbums map
content = content.replace(/                <div className="grid grid-cols-2 gap-3 items-start content-start">\n              \{allAlbums\.map\(\(alb\) => \{/g, `                {/* TikTok Albums are currently hidden due to API issues */}
                {false && (
                <div className="grid grid-cols-2 gap-3 items-start content-start">
              {allAlbums.map((alb) => {`);

// Close the boolean block
content = content.replace(/                \);\n              \}\)\}\n              <\/div>\n\n              \{\/\* Other Fetched Tracks \(YouTube, Facebook, NCT, or custom URLs\) \*\/\}/g, `                );
              })}
              </div>
              )}

              {/* Other Fetched Tracks (YouTube, Facebook, NCT, or custom URLs) */}`);

fs.writeFileSync('src/App.tsx', content);
