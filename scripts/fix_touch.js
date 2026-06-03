import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Remove touch from main layout
content = content.replace(
  '        className="flex-1 overflow-y-auto w-full h-full pb-10 custom-scrollbar relative z-10 p-4 max-w-screen-sm mx-auto flex flex-col"\n        onTouchStart={handleTouchStart}\n        onTouchEnd={handleTouchEnd}\n      >',
  '        className="flex-1 overflow-y-auto w-full h-full pb-10 custom-scrollbar relative z-10 p-4 max-w-screen-sm mx-auto flex flex-col"\n      >'
);

// Add touch to Player Section
content = content.replace(
  '          <div className="flex-1 flex flex-col items-center justify-center min-h-[350px] bg-[#12141D] p-6 rounded-3xl border border-white/5 mb-6 shadow-xl relative isolate shrink-0">',
  '          <div className="flex-1 flex flex-col items-center justify-center min-h-[350px] bg-[#12141D] p-6 rounded-3xl border border-white/5 mb-6 shadow-xl relative isolate shrink-0" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>'
);

fs.writeFileSync('src/App.tsx', content);
console.log("Fixed touch");
