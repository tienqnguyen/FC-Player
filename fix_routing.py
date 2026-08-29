import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# Replace:
old_str = """      lastNode = merger;
      lastNode.connect(ctx.destination);
      
      // Setup original audio if it exists
      if (originalAudioElementRef.current && !originalAudioSourceRef.current) {
        try {
          const originalSource = ctx.createMediaElementSource(originalAudioElementRef.current);
          originalAudioSourceRef.current = originalSource;
          originalSource.connect(pluginIn); // Bypass all the stem mixing stuff, just go to plugins
        } catch (e) {
          console.error("Could not bind original audio source:", e);
        }
      }
      
      revGain.connect(eqNodes[0]);"""

new_str = """      lastNode = merger;
      
      const pluginIn = ctx.createGain();
      const pluginOut = ctx.createGain();
      lastNode.connect(pluginIn);
      pluginIn.connect(pluginOut);
      pluginOut.connect(ctx.destination);
      
      masterPluginInputRef.current = pluginIn;
      masterPluginOutputRef.current = pluginOut;
      setAudioNodesReady(true);
      
      // Setup original audio if it exists
      if (originalAudioElementRef.current && !originalAudioSourceRef.current) {
        try {
          const originalSource = ctx.createMediaElementSource(originalAudioElementRef.current);
          originalAudioSourceRef.current = originalSource;
          originalSource.connect(pluginIn); // Bypass all the stem mixing stuff, just go to plugins
        } catch (e) {
          console.error("Could not bind original audio source:", e);
        }
      }
      
      revGain.connect(eqNodes[0]);"""

if old_str in content:
    content = content.replace(old_str, new_str)
    with open('src/components/StemStudio.tsx', 'w') as f:
        f.write(content)
    print("Fixed routing!")
else:
    print("Could not find the old string.")
