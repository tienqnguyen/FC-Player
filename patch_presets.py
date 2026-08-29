import re

with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

# Add presets array and state
presets_code = """  const presets = [
    { name: 'Neutral', vals: { satDrive: 0, satWarm: 0, dynComp: 0, dynShape: 2, eqSub: 50, eqLow: 50, eqMid: 50, eqHiMid: 50, eqHigh: 50, eqAir: 50, modDepth: 0, modAnalog: 0, maxMulti: 0, maxClip: 'SOFT', pS: true, pD: true, pT: true, pM: true, pMax: true } },
    { name: 'HD Mastering', vals: { satDrive: 24, satWarm: 12, dynComp: 40, dynShape: 2, eqSub: 60, eqLow: 40, eqMid: 45, eqHiMid: 60, eqHigh: 50, eqAir: 70, modDepth: 10, modAnalog: 15, maxMulti: 30, maxClip: 'SOFT', pS: true, pD: true, pT: true, pM: true, pMax: true } },
    { name: 'Warm Vintage', vals: { satDrive: 45, satWarm: 60, dynComp: 60, dynShape: 1, eqSub: 70, eqLow: 60, eqMid: 40, eqHiMid: 30, eqHigh: 20, eqAir: 10, modDepth: 35, modAnalog: 50, maxMulti: 20, maxClip: 'SOFT', pS: true, pD: true, pT: true, pM: true, pMax: true } },
    { name: 'Radio Lo-Fi', vals: { satDrive: 80, satWarm: 80, dynComp: 80, dynShape: 3, eqSub: 10, eqLow: 20, eqMid: 80, eqHiMid: 80, eqHigh: 20, eqAir: 5, modDepth: 70, modAnalog: 90, maxMulti: 50, maxClip: 'HARD', pS: true, pD: true, pT: true, pM: true, pMax: true } },
  ];
  const [presetIdx, setPresetIdx] = useState(0);

  const applyPreset = (idx: number) => {
    setPresetIdx(idx);
    const p = presets[idx].vals;
    setSaturateDrive(p.satDrive);
    setSaturateWarm(p.satWarm);
    setDynamicsComp(p.dynComp);
    setDynamicsShape(p.dynShape);
    setEqSub(p.eqSub);
    setEqLow(p.eqLow);
    setEqMid(p.eqMid);
    setEqHiMid(p.eqHiMid);
    setEqHigh(p.eqHigh);
    setEqAir(p.eqAir);
    setModDepth(p.modDepth);
    setModAnalog(p.modAnalog);
    setMaxMulti(p.maxMulti);
    setMaxClip(p.maxClip);
    setPowerSaturate(p.pS);
    setPowerDynamics(p.pD);
    setPowerTone(p.pT);
    setPowerModulate(p.pM);
    setPowerMaximize(p.pMax);
  };
"""

# Insert right after `const [maxClip, setMaxClip] = useState('SOFT');`
content = content.replace("const [maxClip, setMaxClip] = useState('SOFT');", "const [maxClip, setMaxClip] = useState('SOFT');\n" + presets_code)

# Update UI for preset switching
ui_old = """            <div className="flex items-center bg-black/50 border border-white/10 rounded px-3 py-1.5 min-w-[200px] justify-between">
              <span className="text-white text-xs font-mono">HD Mastering*</span>
              <div className="flex items-center gap-1 text-white/50">
                <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-white" />
                <ChevronRight className="w-4 h-4 cursor-pointer hover:text-white" />
                <Plus className="w-4 h-4 cursor-pointer hover:text-white ml-2" />
              </div>
            </div>"""

ui_new = """            <div className="flex items-center bg-black/50 border border-white/10 rounded px-3 py-1.5 min-w-[200px] justify-between">
              <span className="text-white text-xs font-mono truncate mr-2">{presets[presetIdx].name}</span>
              <div className="flex items-center gap-1 text-white/50">
                <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-white" onClick={() => applyPreset((presetIdx - 1 + presets.length) % presets.length)} />
                <ChevronRight className="w-4 h-4 cursor-pointer hover:text-white" onClick={() => applyPreset((presetIdx + 1) % presets.length)} />
                <RotateCcw className="w-3.5 h-3.5 cursor-pointer hover:text-white ml-2" onClick={() => applyPreset(0)} title="Reset to Neutral" />
              </div>
            </div>"""

content = content.replace(ui_old, ui_new)

with open('src/components/AudioEnhancer.tsx', 'w') as f:
    f.write(content)
print("Added presets")
