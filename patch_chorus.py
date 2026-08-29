import re

with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

# Add dry/wet nodes for chorus
setup_old = """    const modDepthNode = audioCtx.createGain(); modDepthNode.gain.value = 0;
    lfo.connect(modDepthNode); modDepthNode.connect(modDelay.delayTime);

    const maxGain = audioCtx.createGain();"""

setup_new = """    const modDepthNode = audioCtx.createGain(); modDepthNode.gain.value = 0;
    lfo.connect(modDepthNode); modDepthNode.connect(modDelay.delayTime);
    const modMix = audioCtx.createGain(); modMix.gain.value = 0.5; // wet
    const modDry = audioCtx.createGain(); modDry.gain.value = 0.5; // dry
    const modSum = audioCtx.createGain();

    const maxGain = audioCtx.createGain();"""

content = content.replace(setup_old, setup_new)

nodes_old = """      lfo, modDelay, modDepthNode, maxGain, limiter
    };"""

nodes_new = """      lfo, modDelay, modDepthNode, modMix, modDry, modSum, maxGain, limiter
    };"""

content = content.replace(nodes_old, nodes_new)

cleanup_old = """        lfo.stop(); lfo.disconnect(); modDepthNode.disconnect(); modDelay.disconnect();
        maxGain.disconnect(); limiter.disconnect();"""

cleanup_new = """        lfo.stop(); lfo.disconnect(); modDepthNode.disconnect(); modDelay.disconnect();
        modMix.disconnect(); modDry.disconnect(); modSum.disconnect();
        maxGain.disconnect(); limiter.disconnect();"""

content = content.replace(cleanup_old, cleanup_new)

disconnect_old = """    try { n.modDelay.disconnect(); } catch(e){}"""
disconnect_new = """    try { n.modDelay.disconnect(); n.modMix.disconnect(); n.modDry.disconnect(); n.modSum.disconnect(); } catch(e){}"""
content = content.replace(disconnect_old, disconnect_new)

route_old = """    if (powerModulate) {
      currentNode.connect(n.modDelay);
      currentNode = n.modDelay;
    }"""

route_new = """    if (powerModulate) {
      currentNode.connect(n.modDelay);
      currentNode.connect(n.modDry);
      n.modDelay.connect(n.modMix);
      n.modDry.connect(n.modSum);
      n.modMix.connect(n.modSum);
      currentNode = n.modSum;
    }"""

content = content.replace(route_old, route_new)

param_old = """    // Modulate
    if (powerModulate) {
      n.modDepthNode.gain.setTargetAtTime(modDepth * 0.00005, time, 0.05);
      n.lfo.frequency.setTargetAtTime(0.1 + (modAnalog / 20), time, 0.05); // Maps 0-100 to 0.1Hz - 5.1Hz
    }"""

param_new = """    // Modulate
    if (powerModulate) {
      n.modDepthNode.gain.setTargetAtTime(modDepth * 0.00005, time, 0.05);
      n.lfo.frequency.setTargetAtTime(0.1 + (modAnalog / 20), time, 0.05);
      // Mix: 100% dry when depth is 0, up to 50/50 when depth is > 0
      n.modMix.gain.setTargetAtTime(modDepth === 0 ? 0 : 0.5, time, 0.05);
      n.modDry.gain.setTargetAtTime(modDepth === 0 ? 1.0 : 0.5, time, 0.05);
    }"""

content = content.replace(param_old, param_new)

with open('src/components/AudioEnhancer.tsx', 'w') as f:
    f.write(content)
print("Patched chorus")
