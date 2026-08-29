import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(r'      lastNode = merger;\s*lastNode\.connect\(ctx\.destination\);\s*// Setup original audio if it exists\s*if \(originalAudioElementRef\.current && !originalAudioSourceRef\.current\) \{\s*try \{\s*const originalSource = ctx\.createMediaElementSource\(originalAudioElementRef\.current\);\s*originalAudioSourceRef\.current = originalSource;\s*originalSource\.connect\(pluginIn\); // Bypass all the stem mixing stuff, just go to plugins\s*\} catch \(e\) \{\s*console\.error\("Could not bind original audio source:", e\);\s*\}\s*\}\s*revGain\.connect\(eqNodes\[0\]\);', re.MULTILINE)

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

if pattern.search(content):
    content = pattern.sub(new_str, content)
    with open('src/components/StemStudio.tsx', 'w') as f:
        f.write(content)
    print("Fixed routing!")
else:
    print("Could not match pattern.")
