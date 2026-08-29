import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# 1. Add refs to StemStudio
refs_to_add = """  // Master plugin routing refs
  const masterPluginInputRef = useRef<GainNode | null>(null);
  const masterPluginOutputRef = useRef<GainNode | null>(null);
  const originalAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const originalAudioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
"""
idx1 = content.find("  const masterGainRef = useRef<GainNode | null>(null);")
if idx1 != -1:
    content = content[:idx1] + refs_to_add + "\n" + content[idx1:]
else:
    print("Could not find masterGainRef")

# 2. Add pluginInput and pluginOutput to initAudio
# Where `lastNode = merger; lastNode.connect(ctx.destination);` is:
old_routing = """      lastNode = merger;
      lastNode.connect(ctx.destination);"""
new_routing = """      lastNode = merger;
      const pluginIn = ctx.createGain();
      const pluginOut = ctx.createGain();
      lastNode.connect(pluginIn);
      pluginIn.connect(pluginOut);
      pluginOut.connect(ctx.destination);
      
      masterPluginInputRef.current = pluginIn;
      masterPluginOutputRef.current = pluginOut;"""
content = content.replace(old_routing, new_routing)

# 3. Handle original audio element source inside initAudio or dynamically
setup_original = """
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
"""
idx2 = content.find("      revGain.connect(eqNodes[0]);")
if idx2 != -1:
    content = content[:idx2] + setup_original + "\n" + content[idx2:]
else:
    print("Could not find revGain.connect")

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
print("Added graph refs")
