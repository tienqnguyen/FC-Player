const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const uiSection = `
              {/* WebGPU Settings */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5" />
                    WebGPU Separation Quality
                  </h3>
                  <span className="text-[8px] bg-purple-500/15 border border-purple-500/30 text-purple-400 px-1.5 py-0.5 rounded font-black font-mono">LOCAL SETTING</span>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                  Adjust the FIR filter resolution (taps) for local stem separation. Higher values yield better isolation but take longer to process.
                </p>
                <div className="flex gap-2 items-center">
                  <select
                    value={webgpuQuality}
                    onChange={(e) => {
                      const val = e.target.value as 'fast' | 'high' | 'ultra' | 'pro';
                      setWebgpuQuality(val);
                      localStorage.setItem("stemmix_webgpu_quality", val);
                    }}
                    className="flex-1 bg-black/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/15"
                  >
                    <option value="fast">Fast (255 taps) - Low Quality</option>
                    <option value="high">High (1023 taps) - Good Quality</option>
                    <option value="ultra">Ultra (4095 taps) - Professional</option>
                    <option value="pro">Max Pro (8191 taps) - Audiophile</option>
                  </select>
                </div>
              </div>
`;

code = code.replace(
  /\{\/\* Section A: App Default Playlist \(NhacCuaTui\) \*\/\}/,
  uiSection + '\n              {/* Section A: App Default Playlist (NhacCuaTui) */}'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx UI.");
