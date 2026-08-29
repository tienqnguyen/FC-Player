with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

import re
content = re.sub(
    r'<span className="text-\[9px\] font-mono font-medium text-white/30">\{1 \+ \(active8D \? 1 : 0\) \+ \(activeBassBoost \? 1 : 0\) \+ \(activeSpeedFx \? 1 : 0\)\} Active</span>',
    '<span className="text-[9px] font-mono font-medium text-white/30">{(active8D ? 1 : 0) + (activeBassBoost ? 1 : 0) + (activeSpeedFx ? 1 : 0)} Active</span>',
    content
)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
print("Patched counter")
