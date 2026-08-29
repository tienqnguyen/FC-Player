import re

with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

# We need to insert the DSP graph logic.
# After state declarations:
dsp_logic = """
  // Web Audio API DSP Nodes refs
  const nodesRef = React.useRef<any>({});

  useEffect(() => {
    if (!audioCtx || !inputNode || !outputNode) return;

    // Initialize nodes
    const drive = audioCtx.createWaveShaper();
    const warm = audioCtx.createBiquadFilter();
    warm.type = 'lowpass';
    
    const comp = audioCtx.createDynamicsCompressor();
    
    const eqSubNode = audioCtx.createBiquadFilter(); eqSubNode.type = 'lowshelf'; eqSubNode.frequency.value = 60;
    const eqLowNode = audioCtx.createBiquadFilter(); eqLowNode.type = 'peaking'; eqLowNode.frequency.value = 250;
    const eqMidNode = audioCtx.createBiquadFilter(); eqMidNode.type = 'peaking'; eqMidNode.frequency.value = 1000;
    const eqHiMidNode = audioCtx.createBiquadFilter(); eqHiMidNode.type = 'peaking'; eqHiMidNode.frequency.value = 4000;
    const eqHighNode = audioCtx.createBiquadFilter(); eqHighNode.type = 'highshelf'; eqHighNode.frequency.value = 10000;
    const eqAirNode = audioCtx.createBiquadFilter(); eqAirNode.type = 'highshelf'; eqAirNode.frequency.value = 16000;
    
    const lfo = audioCtx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.5; lfo.start();
    const modDelay = audioCtx.createDelay(); modDelay.delayTime.value = 0.005;
    const modDepthNode = audioCtx.createGain(); modDepthNode.gain.value = 0;
    lfo.connect(modDepthNode); modDepthNode.connect(modDelay.delayTime);

    const maxGain = audioCtx.createGain();
    const limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.value = -2.0;
    limiter.knee.value = 0.0;
    limiter.ratio.value = 20.0;
    limiter.attack.value = 0.005;
    limiter.release.value = 0.050;

    nodesRef.current = {
      drive, warm, comp, 
      eqSubNode, eqLowNode, eqMidNode, eqHiMidNode, eqHighNode, eqAirNode,
      lfo, modDelay, modDepthNode, maxGain, limiter
    };

    return () => {
      // Cleanup
      try {
        inputNode.disconnect();
        drive.disconnect(); warm.disconnect(); comp.disconnect();
        eqSubNode.disconnect(); eqLowNode.disconnect(); eqMidNode.disconnect(); eqHiMidNode.disconnect(); eqHighNode.disconnect(); eqAirNode.disconnect();
        lfo.stop(); lfo.disconnect(); modDepthNode.disconnect(); modDelay.disconnect();
        maxGain.disconnect(); limiter.disconnect();
        inputNode.connect(outputNode);
      } catch (e) {}
    };
  }, [audioCtx, inputNode, outputNode]);

  // Update routing and parameters based on state
  useEffect(() => {
    if (!audioCtx || !inputNode || !outputNode || !nodesRef.current.drive) return;
    const n = nodesRef.current;

    // Disconnect everything first
    try { inputNode.disconnect(); } catch (e) {}
    try { n.drive.disconnect(); n.warm.disconnect(); n.comp.disconnect(); } catch(e){}
    try { n.eqSubNode.disconnect(); n.eqLowNode.disconnect(); n.eqMidNode.disconnect(); n.eqHiMidNode.disconnect(); n.eqHighNode.disconnect(); n.eqAirNode.disconnect(); } catch(e){}
    try { n.modDelay.disconnect(); } catch(e){}
    try { n.maxGain.disconnect(); n.limiter.disconnect(); } catch(e){}

    if (bypass) {
      inputNode.connect(outputNode);
      return;
    }

    // Build the active chain
    let currentNode = inputNode as AudioNode;

    if (powerSaturate) {
      // Drive curve
      const k = saturateDrive * 2; // 0 to 200
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
      n.drive.curve = curve;
      n.drive.oversample = '4x';
      
      n.warm.frequency.value = 22000 - (saturateWarm * 150); // Warm rolls off highs
      
      currentNode.connect(n.drive);
      n.drive.connect(n.warm);
      currentNode = n.warm;
    }

    if (powerDynamics) {
      n.comp.threshold.value = -30 + (100 - dynamicsComp) * 0.2; // -30 to -10
      n.comp.ratio.value = 2 + (dynamicsComp / 20); // 2 to 7
      n.comp.attack.value = dynamicsShape === 1 ? 0.01 : dynamicsShape === 2 ? 0.05 : 0.1;
      n.comp.release.value = 0.2;
      
      currentNode.connect(n.comp);
      currentNode = n.comp;
    }

    if (powerTone) {
      n.eqSubNode.gain.value = (eqSub - 50) / 2.5; // -20 to +20 dB
      n.eqLowNode.gain.value = (eqLow - 50) / 2.5;
      n.eqMidNode.gain.value = (eqMid - 50) / 2.5;
      n.eqHiMidNode.gain.value = (eqHiMid - 50) / 2.5;
      n.eqHighNode.gain.value = (eqHigh - 50) / 2.5;
      n.eqAirNode.gain.value = (eqAir - 50) / 2.5;

      currentNode.connect(n.eqSubNode);
      n.eqSubNode.connect(n.eqLowNode);
      n.eqLowNode.connect(n.eqMidNode);
      n.eqMidNode.connect(n.eqHiMidNode);
      n.eqHiMidNode.connect(n.eqHighNode);
      n.eqHighNode.connect(n.eqAirNode);
      currentNode = n.eqAirNode;
    }

    if (powerModulate) {
      n.modDepthNode.gain.value = modDepth * 0.00005; // very subtle flutter
      currentNode.connect(n.modDelay);
      currentNode = n.modDelay;
    }

    if (powerMaximize) {
      n.maxGain.gain.value = 1 + (maxMulti / 50); // up to +6dB input gain
      n.limiter.knee.value = maxClip === 'SOFT' ? 10 : 0;
      
      currentNode.connect(n.maxGain);
      n.maxGain.connect(n.limiter);
      currentNode = n.limiter;
    }

    // Connect to output
    currentNode.connect(outputNode);

  }, [bypass, powerSaturate, powerDynamics, powerTone, powerModulate, powerMaximize,
      saturateDrive, saturateWarm, dynamicsComp, dynamicsShape, 
      eqSub, eqLow, eqMid, eqHiMid, eqHigh, eqAir, 
      modDepth, modAnalog, maxMulti, maxClip, audioCtx, inputNode, outputNode]);
"""

# Let's find a place to insert this
idx = content.find("  const [maxClip, setMaxClip] = useState('SOFT');")
if idx != -1:
    idx += len("  const [maxClip, setMaxClip] = useState('SOFT');")
    content = content[:idx] + "\n" + dsp_logic + "\n" + content[idx:]
    with open('src/components/AudioEnhancer.tsx', 'w') as f:
        f.write(content)
    print("Injected DSP logic into AudioEnhancer.tsx")
else:
    print("Could not find insertion point")
