with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "interface AudioEnhancerProps {\n  onClose: () => void;\n  audioCtx?: AudioContext | null;",
    "interface AudioEnhancerProps {\n  onClose: () => void;\n  isOpen?: boolean;\n  audioCtx?: AudioContext | null;"
)

content = content.replace(
    "export function AudioEnhancer({ onClose, audioCtx, inputNode, outputNode }: AudioEnhancerProps) {",
    "export function AudioEnhancer({ onClose, isOpen = true, audioCtx, inputNode, outputNode }: AudioEnhancerProps) {"
)

with open('src/components/AudioEnhancer.tsx', 'w') as f:
    f.write(content)
print("Fixed isOpen")
