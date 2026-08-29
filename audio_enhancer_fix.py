import re

with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

old_use_effect = """  // Update routing and parameters based on state
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
      modDepth, modAnalog, maxMulti, maxClip, audioCtx, inputNode, outputNode]);"""

new_use_effect = """  // Update routing (only when power flags change)
  useEffect(() => {
    if (!audioCtx || !inputNode || !outputNode || !nodesRef.current.drive) return;
    const n = nodesRef.current;

    try { inputNode.disconnect(); } catch (e) {}
    try { n.drive.disconnect(); n.warm.disconnect(); n.comp.disconnect(); } catch(e){}
    try { n.eqSubNode.disconnect(); n.eqLowNode.disconnect(); n.eqMidNode.disconnect(); n.eqHiMidNode.disconnect(); n.eqHighNode.disconnect(); n.eqAirNode.disconnect(); } catch(e){}
    try { n.modDelay.disconnect(); } catch(e){}
    try { n.maxGain.disconnect(); n.limiter.disconnect(); } catch(e){}

    if (bypass) {
      inputNode.connect(outputNode);
      return;
    }

    let currentNode = inputNode as AudioNode;

    if (powerSaturate) {
      currentNode.connect(n.drive);
      n.drive.connect(n.warm);
      currentNode = n.warm;
    }

    if (powerDynamics) {
      currentNode.connect(n.comp);
      currentNode = n.comp;
    }

    if (powerTone) {
      currentNode.connect(n.eqSubNode);
      n.eqSubNode.connect(n.eqLowNode);
      n.eqLowNode.connect(n.eqMidNode);
      n.eqMidNode.connect(n.eqHiMidNode);
      n.eqHiMidNode.connect(n.eqHighNode);
      n.eqHighNode.connect(n.eqAirNode);
      currentNode = n.eqAirNode;
    }

    if (powerModulate) {
      currentNode.connect(n.modDelay);
      currentNode = n.modDelay;
    }

    if (powerMaximize) {
      currentNode.connect(n.maxGain);
      n.maxGain.connect(n.limiter);
      currentNode = n.limiter;
    }

    currentNode.connect(outputNode);

  }, [bypass, powerSaturate, powerDynamics, powerTone, powerModulate, powerMaximize, audioCtx, inputNode, outputNode]);

  // Update parameters smoothly (runs when sliders change)
  useEffect(() => {
    if (!nodesRef.current.drive) return;
    const n = nodesRef.current;
    const time = audioCtx?.currentTime || 0;

    // Saturate
    if (powerSaturate) {
      const k = saturateDrive * 2;
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x) + 0.001);
      }
      n.drive.curve = curve;
      n.drive.oversample = '4x';
      n.warm.frequency.setTargetAtTime(Math.max(100, 22000 - (saturateWarm * 150)), time, 0.05);
    }

    // Dynamics
    if (powerDynamics) {
      n.comp.threshold.setTargetAtTime(-30 + (100 - dynamicsComp) * 0.2, time, 0.05);
      n.comp.ratio.setTargetAtTime(2 + (dynamicsComp / 20), time, 0.05);
      n.comp.attack.setTargetAtTime(dynamicsShape === 1 ? 0.01 : dynamicsShape === 2 ? 0.05 : 0.1, time, 0.05);
      n.comp.release.setTargetAtTime(0.2, time, 0.05);
    }

    // Tone
    if (powerTone) {
      n.eqSubNode.gain.setTargetAtTime((eqSub - 50) / 2.5, time, 0.05);
      n.eqLowNode.gain.setTargetAtTime((eqLow - 50) / 2.5, time, 0.05);
      n.eqMidNode.gain.setTargetAtTime((eqMid - 50) / 2.5, time, 0.05);
      n.eqHiMidNode.gain.setTargetAtTime((eqHiMid - 50) / 2.5, time, 0.05);
      n.eqHighNode.gain.setTargetAtTime((eqHigh - 50) / 2.5, time, 0.05);
      n.eqAirNode.gain.setTargetAtTime((eqAir - 50) / 2.5, time, 0.05);
    }

    // Modulate
    if (powerModulate) {
      n.modDepthNode.gain.setTargetAtTime(modDepth * 0.00005, time, 0.05);
    }

    // Maximize
    if (powerMaximize) {
      n.maxGain.gain.setTargetAtTime(1 + (maxMulti / 50), time, 0.05);
      n.limiter.knee.setTargetAtTime(maxClip === 'SOFT' ? 10 : 0, time, 0.05);
    }

  }, [saturateDrive, saturateWarm, dynamicsComp, dynamicsShape, 
      eqSub, eqLow, eqMid, eqHiMid, eqHigh, eqAir, 
      modDepth, modAnalog, maxMulti, maxClip,
      powerSaturate, powerDynamics, powerTone, powerModulate, powerMaximize]);
"""

idx = content.find("  // Update routing and parameters based on state")
if idx != -1:
    end_idx = content.find("  // Knob Component")
    if end_idx != -1:
        content = content[:idx] + new_use_effect + "\n" + content[end_idx:]
        with open('src/components/AudioEnhancer.tsx', 'w') as f:
            f.write(content)
        print("Fixed useEffects")
    else:
        print("Couldn't find end_idx")
else:
    print("Couldn't find start idx")
