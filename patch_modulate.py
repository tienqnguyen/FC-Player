import re

with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

mod_old = """    // Modulate
    if (powerModulate) {
      n.modDepthNode.gain.setTargetAtTime(modDepth * 0.00005, time, 0.05);
    }"""

mod_new = """    // Modulate
    if (powerModulate) {
      n.modDepthNode.gain.setTargetAtTime(modDepth * 0.00005, time, 0.05);
      n.lfo.frequency.setTargetAtTime(0.1 + (modAnalog / 20), time, 0.05); // Maps 0-100 to 0.1Hz - 5.1Hz
    }"""

content = content.replace(mod_old, mod_new)

with open('src/components/AudioEnhancer.tsx', 'w') as f:
    f.write(content)
print("Patched modAnalog")
