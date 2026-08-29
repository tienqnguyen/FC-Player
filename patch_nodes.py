import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

refs_old = """  const masterToneHighRef = useRef<BiquadFilterNode | null>(null);"""
refs_new = """  const masterToneHighRef = useRef<BiquadFilterNode | null>(null);
  const masterPannerRef = useRef<StereoPannerNode | null>(null);
  const masterPannerLfoRef = useRef<OscillatorNode | null>(null);
  const masterPannerDepthRef = useRef<GainNode | null>(null);
  const masterBassBoostRef = useRef<BiquadFilterNode | null>(null);"""
content = content.replace(refs_old, refs_new)

routing_old = """      lastNode = merger;

      const pluginIn = ctx.createGain();"""

routing_new = """      lastNode = merger;

      const panner = ctx.createStereoPanner();
      const pannerLfo = ctx.createOscillator();
      const pannerDepth = ctx.createGain();
      pannerLfo.type = 'sine';
      pannerLfo.frequency.value = 0.15;
      pannerLfo.start();
      pannerDepth.gain.value = 0;
      pannerLfo.connect(pannerDepth);
      pannerDepth.connect(panner.pan);
      masterPannerRef.current = panner;
      masterPannerLfoRef.current = pannerLfo;
      masterPannerDepthRef.current = pannerDepth;
      lastNode.connect(panner);
      lastNode = panner;

      const bassBoost = ctx.createBiquadFilter();
      bassBoost.type = 'lowshelf';
      bassBoost.frequency.value = 80;
      bassBoost.gain.value = 0;
      masterBassBoostRef.current = bassBoost;
      lastNode.connect(bassBoost);
      lastNode = bassBoost;

      const pluginIn = ctx.createGain();"""
content = content.replace(routing_old, routing_new)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
print("Patched nodes")
