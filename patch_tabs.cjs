const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// We need to re-add the missing parts for the "search" tab.
content = content.replace(
  /Search\s*\{\s*playlistTab === "search" && \(\s*\)\s*\}\s*<\/button>\s*<button\s*<button/g,
  \`Search
                {playlistTab === "search" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-400 rounded-full" />
                )}
              </button>
              <button\`
);

fs.writeFileSync('src/App.tsx', content);
