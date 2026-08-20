const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Hide TK Sound button
code = code.replace(
  /onClick=\{\(\) => \{\n\s*setTiktokSearchType\("sound"\);\n\s*if \(tiktokSearchQuery.trim\(\)\) \{\n\s*handleTiktokSearch\(undefined, false, "sound"\);\n\s*\} else \{\n\s*setTiktokSearchResults\(\[\]\);\n\s*setTiktokSearchError\(""\);\n\s*\}\n\s*\}\}\n\s*className=\{`text-\[8px\] sm:text-\[9px\] font-black tracking-wider uppercase px-1.5 py-1.5 rounded-lg transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center whitespace-nowrap \$\{/g,
  `onClick={() => {
                        setTiktokSearchType("sound");
                        if (tiktokSearchQuery.trim()) {
                          handleTiktokSearch(undefined, false, "sound");
                        } else {
                          setTiktokSearchResults([]);
                          setTiktokSearchError("");
                        }
                      }}
                      className={\`hidden text-[8px] sm:text-[9px] font-black tracking-wider uppercase px-1.5 py-1.5 rounded-lg transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center whitespace-nowrap \${`
);

// Hide TK Video button
code = code.replace(
  /onClick=\{\(\) => \{\n\s*setTiktokSearchType\("video"\);\n\s*if \(tiktokSearchQuery.trim\(\)\) \{\n\s*handleTiktokSearch\(undefined, false, "video"\);\n\s*\} else \{\n\s*setTiktokSearchResults\(\[\]\);\n\s*setTiktokSearchError\(""\);\n\s*\}\n\s*\}\}\n\s*className=\{`text-\[8px\] sm:text-\[9px\] font-black tracking-wider uppercase px-1.5 py-1.5 rounded-lg transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center whitespace-nowrap \$\{/g,
  `onClick={() => {
                        setTiktokSearchType("video");
                        if (tiktokSearchQuery.trim()) {
                          handleTiktokSearch(undefined, false, "video");
                        } else {
                          setTiktokSearchResults([]);
                          setTiktokSearchError("");
                        }
                      }}
                      className={\`hidden text-[8px] sm:text-[9px] font-black tracking-wider uppercase px-1.5 py-1.5 rounded-lg transition-all flex items-center gap-1 flex-1 sm:flex-initial justify-center whitespace-nowrap \${`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched UI buttons");
