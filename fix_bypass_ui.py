import re

files = [
    ('src/components/AudioEnhancer.tsx', 'cyan', 500, 400),
    ('src/components/FcOneKnobPro.tsx', 'orange', 500, 400),
    ('src/components/FcStudioFx.tsx', 'emerald', 500, 400)
]

for filepath, color, shade_bg, shade_text in files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    # We want to replace the className logic
    # Old logic used !bypass ? 'bg-black/50...' : 'bg-COLOR...'
    # We want bypass ? 'bg-black/50...' : 'bg-COLOR...'
    # So we just replace !bypass ? with bypass ?
    
    if '!bypass ?' in content:
        content = content.replace('!bypass ?', 'bypass ?')
        with open(filepath, 'w') as f:
            f.write(content)
            print(f"Fixed {filepath}")
    else:
        print(f"Could not find '!bypass ?' in {filepath}")

