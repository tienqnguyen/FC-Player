import re

with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

replacements = [
    ('<Knob label="COMP" value={dynamicsComp} />', '<Knob label="COMP" value={dynamicsComp} onChange={setDynamicsComp} />'),
    ('<Knob label="COLOR" value={dynamicsShape} max={10} />', '<Knob label="COLOR" value={dynamicsShape} max={10} onChange={setDynamicsShape} />'),
    # Transient and shape aren't implemented, just bind them to dummy state or don't. Or bind them to dynamicsShape for now? Let's just bind them to dynamicsComp for visual activity if needed, but wait they should be independent. I'll just leave them if they don't have state, or remove them.
    # Actually, they don't have states. I'll create dummy state for them so they work visually.
    
    ('<VerticalSlider label="DRIVE" value={saturateDrive} min={0} max={100} />', '<VerticalSlider label="DRIVE" value={saturateDrive} min={0} max={100} onChange={setSaturateDrive} />'),
    ('<VerticalSlider label="WARM" value={saturateWarm} min={0} max={100} />', '<VerticalSlider label="WARM" value={saturateWarm} min={0} max={100} onChange={setSaturateWarm} />'),
    
    ('<VerticalSlider label="SUB" value={eqSub} />', '<VerticalSlider label="SUB" value={eqSub} onChange={setEqSub} />'),
    ('<VerticalSlider label="LOW" value={eqLow} />', '<VerticalSlider label="LOW" value={eqLow} onChange={setEqLow} />'),
    ('<VerticalSlider label="MID" value={eqMid} />', '<VerticalSlider label="MID" value={eqMid} onChange={setEqMid} />'),
    ('<VerticalSlider label="HI MID" value={eqHiMid} />', '<VerticalSlider label="HI MID" value={eqHiMid} onChange={setEqHiMid} />'),
    ('<VerticalSlider label="HIGH" value={eqHigh} />', '<VerticalSlider label="HIGH" value={eqHigh} onChange={setEqHigh} />'),
    ('<VerticalSlider label="AIR+" value={eqAir} />', '<VerticalSlider label="AIR+" value={eqAir} onChange={setEqAir} />'),
    
    ('<Knob label="DEPTH" value={modDepth} />', '<Knob label="DEPTH" value={modDepth} onChange={setModDepth} />'),
    ('<Knob label="ANALOG" value={modAnalog} />', '<Knob label="ANALOG" value={modAnalog} onChange={setModAnalog} />'),
    
    ('<VerticalSlider label="MULTI" value={maxMulti} min={0} max={100} />', '<VerticalSlider label="MULTI" value={maxMulti} min={0} max={100} onChange={setMaxMulti} />'),
]

for old, new_val in replacements:
    content = content.replace(old, new_val)

with open('src/components/AudioEnhancer.tsx', 'w') as f:
    f.write(content)
print("Added onChanges")
