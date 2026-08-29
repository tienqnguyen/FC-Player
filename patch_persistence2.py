import re

with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

return_str = """  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center"""

if return_str in content:
    content = content.replace(return_str, "  if (!isOpen) return null;\n\n" + return_str)
    with open('src/components/AudioEnhancer.tsx', 'w') as f:
        f.write(content)
    print("Patched AudioEnhancer.tsx persistence successfully")
else:
    print("Still could not find the return string")
