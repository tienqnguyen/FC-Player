import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# 1. Add Master Reset handler
reset_handler = """  const handleMasterReset = () => {
    setVolumes({ vocals: 1.0, drums: 1.0, bass: 1.0, guitar: 1.0, piano: 1.0, other: 1.0 });
    setPans({});
    setMutes({});
    setSolos({});
    setSpeed(1.0);
    setReverb(0);
  };
"""

content = content.replace("  const handleRestart = () => {", reset_handler + "\n  const handleRestart = () => {")

# 2. Add Advanced DSP Reset handler
dsp_reset_handler = """  const handleDSPReset = () => {
    setDspLowpass(false);
    setDspChorus(false);
    setDspFlutter(false);
    setDspDecorrelate(false);
  };
"""

content = content.replace("  const handleMasterReset = () => {", dsp_reset_handler + "\n  const handleMasterReset = () => {")

# 3. Add UI buttons
# Advanced DSP:
dsp_header_old1 = '<span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5"><Activity className="w-4 h-4" /> Advanced DSP</span>'
dsp_header_new1 = dsp_header_old1 + '\\n<button onClick={handleDSPReset} className="text-[10px] uppercase font-bold text-white/40 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded">Reset</button>'
content = content.replace(dsp_header_old1, dsp_header_new1.replace('\\n', '\n'))

dsp_header_old2 = '<span className="text-[10px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1"><Activity className="w-3 h-3" /> Advanced DSP</span>'
dsp_header_new2 = dsp_header_old2 + '\\n<button onClick={handleDSPReset} className="text-[9px] uppercase font-bold text-white/40 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded">Reset</button>'
content = content.replace(dsp_header_old2, dsp_header_new2.replace('\\n', '\n'))

# Master Reset Button near Stem Studio badge
badge_old = """          <span className="text-[9px] font-black tracking-[0.12em] text-amber-400 uppercase bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 shrink-0 hidden md:inline-block">
             Stem Studio
          </span>"""

badge_new = badge_old + """
          <button onClick={handleMasterReset} className="text-[9px] font-black tracking-[0.12em] text-white/50 hover:text-white uppercase bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded border border-white/10 shrink-0 hidden md:inline-block transition-colors ml-2">
             Reset Master
          </button>"""

content = content.replace(badge_old, badge_new)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
print("Added reset buttons")
