const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target1 = `        </div> {/* End Column 1 */}
        {/* Column 2 (Playlist) */}
        <div className={\`w-full flex flex-col \${!isCompact ? "flex-1 overflow-y-auto custom-scrollbar h-full min-w-[400px] max-w-[800px]" : "flex-1 min-h-0"}\`}>
        {/* Playlist wrapper logic is kept below */}
`;
if (code.split(target1).length > 2) {
    code = code.replace(target1, '');
}

fs.writeFileSync('src/App.tsx', code);
