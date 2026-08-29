import re

with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

# Saturate Drive Fix
saturate_old = """      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x) + 0.001);
      }
      n.drive.curve = curve;
      n.drive.oversample = '4x';"""

saturate_new = """      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x) + 0.001);
      }
      n.drive.curve = saturateDrive === 0 ? null : curve;
      n.drive.oversample = '4x';"""

content = content.replace(saturate_old, saturate_new)

# Saturate Warmth Fix (22000 is good, but let's make sure it's fully open)
content = content.replace("n.warm.frequency.setTargetAtTime(Math.max(100, 22000 - (saturateWarm * 150)), time, 0.05);", "n.warm.frequency.setTargetAtTime(saturateWarm === 0 ? 24000 : Math.max(100, 22000 - (saturateWarm * 200)), time, 0.05);")

# Dynamics Comp Fix
dyn_old = """    if (powerDynamics) {
      n.comp.threshold.setTargetAtTime(-30 + (100 - dynamicsComp) * 0.2, time, 0.05);
      n.comp.ratio.setTargetAtTime(2 + (dynamicsComp / 20), time, 0.05);"""

dyn_new = """    if (powerDynamics) {
      n.comp.threshold.setTargetAtTime(dynamicsComp === 0 ? 0 : (-40 + (100 - dynamicsComp) * 0.4), time, 0.05);
      n.comp.ratio.setTargetAtTime(1 + (dynamicsComp / 10), time, 0.05);"""

content = content.replace(dyn_old, dyn_new)

with open('src/components/AudioEnhancer.tsx', 'w') as f:
    f.write(content)
print("Patched transparency")
