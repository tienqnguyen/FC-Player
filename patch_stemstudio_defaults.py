import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# 1. STEM STUDIO Defaults
content = content.replace("vocals: 0.8, drums: 0.8, bass: 0.8, guitar: 0.8, piano: 0.8, other: 0.8", "vocals: 1.0, drums: 1.0, bass: 1.0, guitar: 1.0, piano: 1.0, other: 1.0")

# 2. Advanced DSP Defaults (remove localStorage load)
content = re.sub(r'useState<boolean>\(\(\) => localStorage\.getItem\("dsp_lowpass"\) === "true"\)', 'useState<boolean>(false)', content)
content = re.sub(r'useState<boolean>\(\(\) => localStorage\.getItem\("dsp_chorus"\) === "true"\)', 'useState<boolean>(false)', content)
content = re.sub(r'useState<boolean>\(\(\) => localStorage\.getItem\("dsp_flutter"\) === "true"\)', 'useState<boolean>(false)', content)
content = re.sub(r'useState<boolean>\(\(\) => localStorage\.getItem\("dsp_decorrelate"\) === "true"\)', 'useState<boolean>(false)', content)

# 3. Create a master RESET BUTTON
# Let's find a place to put it, maybe near the "Stem Mix" or "Advanced DSP" header.
# Wait, "Master Reset BUTTON" -> I'll add a Master Reset button next to the Export button or close button, or header.

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
print("Updated defaults")
