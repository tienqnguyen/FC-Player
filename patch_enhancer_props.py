import re

with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

content = content.replace("interface AudioEnhancerProps {\n  onClose: () => void;\n}", "interface AudioEnhancerProps {\n  onClose: () => void;\n  audioCtx?: AudioContext | null;\n  inputNode?: AudioNode | null;\n  outputNode?: AudioNode | null;\n}")
content = content.replace("export function AudioEnhancer({ onClose }: AudioEnhancerProps) {", "export function AudioEnhancer({ onClose, audioCtx, inputNode, outputNode }: AudioEnhancerProps) {")

with open('src/components/AudioEnhancer.tsx', 'w') as f:
    f.write(content)
print("Patched props")
