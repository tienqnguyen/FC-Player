import re

with open('src/components/FcStudioFx.tsx', 'r') as f:
    content = f.read()

# Add to props
content = content.replace(
    'export interface FcStudioFxProps {',
    'export interface FcStudioFxProps {\n  isBypassed: boolean;\n  onBypassChange: (b: boolean) => void;'
)

content = content.replace(
    'export function FcStudioFx({ onClose, isOpen = true, audioCtx, inputNode, outputNode }: FcStudioFxProps) {',
    'export function FcStudioFx({ onClose, isOpen = true, audioCtx, inputNode, outputNode, isBypassed, onBypassChange }: FcStudioFxProps) {\n  const bypass = isBypassed;\n  const setBypass = onBypassChange;'
)

# Add Reset function
reset_fn = """
  const handleReset = () => {
    setCompThresh(-24); setCompRatio(4); setCompAttack(15); setCompMakeup(2);
    setDeEsser(40); setAir(50); setExciter(20);
    setModRate(2); setModDepth(60);
    setStereoWidth(130); setLimitThresh(-2);
    setCompActive(true); setVocalActive(true); setModActive(false); setMasterActive(true);
  };
"""

content = content.replace(
    '// Update Parameters',
    reset_fn + '\n  // Update Parameters'
)

# Routing bypass
routing_old = """    // Serial Routing
    inputNode.connect(mod1.In);
    mod1.Out.connect(mod2.In);
    mod2.Out.connect(mod3.In);
    mod3.Out.connect(mod4.In);
    mod4.Out.connect(outputNode);"""

routing_new = """    // Serial Routing
    if (bypass) {
        inputNode.connect(outputNode);
    } else {
        inputNode.connect(mod1.In);
        mod1.Out.connect(mod2.In);
        mod2.Out.connect(mod3.In);
        mod3.Out.connect(mod4.In);
        mod4.Out.connect(outputNode);
    }"""
# Note: actually this goes in the useEffect, but it's tricky since bypass changes.
