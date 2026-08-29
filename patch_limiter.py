import re

with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

limiter_old = """    // Maximize
    if (powerMaximize) {
      n.maxGain.gain.setTargetAtTime(1 + (maxMulti / 50), time, 0.05);
      n.limiter.knee.setTargetAtTime(maxClip === 'SOFT' ? 10 : 0, time, 0.05);
    }"""

limiter_new = """    // Maximize
    if (powerMaximize) {
      n.maxGain.gain.setTargetAtTime(1 + (maxMulti / 50), time, 0.05);
      n.limiter.threshold.setTargetAtTime(maxMulti === 0 ? 0 : -2.0, time, 0.05);
      n.limiter.ratio.setTargetAtTime(maxMulti === 0 ? 1 : 20.0, time, 0.05);
      n.limiter.knee.setTargetAtTime(maxClip === 'SOFT' ? 10 : 0, time, 0.05);
    }"""

content = content.replace(limiter_old, limiter_new)

with open('src/components/AudioEnhancer.tsx', 'w') as f:
    f.write(content)
print("Patched limiter")
