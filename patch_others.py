import re

# AudioEnhancer
with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'export interface AudioEnhancerProps \{([\s\S]*?)\}',
    r'export interface AudioEnhancerProps {\1  isBypassed: boolean;\n  onBypassChange: (b: boolean) => void;\n}',
    content
)

content = content.replace(
    'export function AudioEnhancer({ onClose, isOpen = true, audioCtx, inputNode, outputNode }: AudioEnhancerProps) {',
    'export function AudioEnhancer({ onClose, isOpen = true, audioCtx, inputNode, outputNode, isBypassed, onBypassChange }: AudioEnhancerProps) {'
)

content = content.replace(
    '  const [bypass, setBypass] = useState(true);',
    '  const bypass = isBypassed;\n  const setBypass = onBypassChange;'
)

with open('src/components/AudioEnhancer.tsx', 'w') as f:
    f.write(content)


# FcOneKnobPro
with open('src/components/FcOneKnobPro.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'export interface FcOneKnobProProps \{([\s\S]*?)\}',
    r'export interface FcOneKnobProProps {\1  isBypassed: boolean;\n  onBypassChange: (b: boolean) => void;\n}',
    content
)

content = content.replace(
    'export function FcOneKnobPro({ onClose, isOpen = true, audioCtx, inputNode, outputNode }: FcOneKnobProProps) {',
    'export function FcOneKnobPro({ onClose, isOpen = true, audioCtx, inputNode, outputNode, isBypassed, onBypassChange }: FcOneKnobProProps) {'
)

content = content.replace(
    '  const [bypass, setBypass] = useState(false);',
    '  const bypass = isBypassed;\n  const setBypass = onBypassChange;'
)

with open('src/components/FcOneKnobPro.tsx', 'w') as f:
    f.write(content)
