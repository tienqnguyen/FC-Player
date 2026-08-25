const fs = require('fs');
let content = fs.readFileSync('src/components/StemStudio.tsx', 'utf8');

// The replacement was missing a closing div for the fixed overlay.
// Look at around line 4120.
content = content.replace(
    '                    )}\n                </div>\n            )}\n       {/* Dynamic Cover Artwork Background */}',
    '                    )}\n                </div>\n</div>\n            )}\n       {/* Dynamic Cover Artwork Background */}'
);

fs.writeFileSync('src/components/StemStudio.tsx', content);
