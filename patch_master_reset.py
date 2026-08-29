import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# Update handleMasterReset
old_master_reset = """  const handleMasterReset = () => {
    setVolumes({ vocals: 1.0, drums: 1.0, bass: 1.0, guitar: 1.0, piano: 1.0, other: 1.0 });
    setPans({});
    setMutes({});
    setSolos({});
    setSpeed(1.0);
    setReverb(0);
  };"""

new_master_reset = """  const handleMasterReset = () => {
    setVolumes({ vocals: 1.0, drums: 1.0, bass: 1.0, guitar: 1.0, piano: 1.0, other: 1.0 });
    setPans({});
    setMutes({});
    setSolos({});
    setSpeed(1.0);
    setPreservePitch(true);
    setReverb(0);
    handleResetSunoOriginal();
    setIsSunoBypass(false);
    handleDSPReset();
    setMasterEq(masterEq.map((b) => ({ ...b, g: 0 })));
    setActive8D(false);
    setActiveBassBoost(false);
    setActiveSpeedFx(null);
    setFcAudioBypassed(true);
    setFcOneKnobBypassed(true);
    setFcStudioBypassed(true);
  };"""

if old_master_reset in content:
    content = content.replace(old_master_reset, new_master_reset)
    print("Patched handleMasterReset")
else:
    print("Could not find handleMasterReset")

# Update Master FX reset button
old_fx_reset = """                   <button 
                      onClick={(e) => {
                         e.stopPropagation();
                         setSpeed(1);
                         setPreservePitch(true);
                         setReverb(0);
                      }}
                      className="text-[8px] font-black uppercase tracking-wider sm:tracking-widest text-white/40 hover:text-white/80 active:scale-95 transition-all bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg"
                   >
                      Reset
                   </button>"""

new_fx_reset = """                   <button 
                      onClick={(e) => {
                         e.stopPropagation();
                         setSpeed(1);
                         setPreservePitch(true);
                         setReverb(0);
                         handleResetSunoOriginal();
                         setIsSunoBypass(false);
                         handleDSPReset();
                      }}
                      className="text-[8px] font-black uppercase tracking-wider sm:tracking-widest text-white/40 hover:text-white/80 active:scale-95 transition-all bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg"
                   >
                      Reset
                   </button>"""

if old_fx_reset in content:
    content = content.replace(old_fx_reset, new_fx_reset)
    print("Patched Master FX reset")
else:
    print("Could not find Master FX reset button")

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
