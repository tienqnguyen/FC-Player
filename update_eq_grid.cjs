const fs = require('fs');
let code = fs.readFileSync('src/components/StemStudio.tsx', 'utf-8');

const target = `<div className="flex-1 flex gap-2 sm:gap-4 overflow-x-auto overflow-y-hidden pb-4 items-center justify-start scrollbar-none" style={{ minWidth: "100%" }}>`;

const replacement = `<div className="flex-1 grid grid-cols-5 gap-y-6 gap-x-2 pb-4 place-items-center w-full max-w-[600px] mx-auto">`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    
    // Also, the sliders should probably be a bit shorter if they are stacked in 3 rows.
    // Replace h-[120px] with h-[80px] or h-[90px]
    code = code.replace(/h-\[120px\]/g, 'h-[90px]');
    // Replace slider width 120px with 90px
    code = code.replace(/width: '120px'/g, "width: '90px'");
    
    fs.writeFileSync('src/components/StemStudio.tsx', code);
    console.log("Updated EQ grid layout");
} else {
    console.log("Could not find target EQ grid");
}
