const fs = require('fs');
let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// I also added a </div> inside the expandedSections.lyric check before.
// We must remove the trailing `</div>` at line 4120
content = content.replace(
    '                </div>\n</div>\n            )}\n            {expandedSections.lyric && (',
    '                </div>\n            )}\n            {expandedSections.lyric && ('
);

fs.writeFileSync('src/components/StemStudio.tsx', content);
