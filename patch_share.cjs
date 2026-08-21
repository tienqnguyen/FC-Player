const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<div className="absolute bottom-1.5 right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-400/90 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                           <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current ml-0.5" />
                         </div>`;

const replacement = `<div className="absolute bottom-1.5 right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-400/90 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                           <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current ml-0.5" />
                         </div>
                         
                         <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               handleToggleShareUsername(alb);
                             }}
                             className={\`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center backdrop-blur-md border \${
                               firebaseUsernames.some(u => u.username.toLowerCase() === alb.username.toLowerCase())
                                 ? 'bg-emerald-500/80 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                 : 'bg-black/40 border-white/20 text-white/70 hover:bg-black/60 hover:text-white'
                             }\`}
                             title={firebaseUsernames.some(u => u.username.toLowerCase() === alb.username.toLowerCase()) ? "Unshare from Public" : "Share to Public"}
                           >
                             <Globe className="w-3.5 h-3.5" />
                           </button>
                         </div>`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Patched Share button");
} else {
    console.log("Could not find the target code snippet.");
}
