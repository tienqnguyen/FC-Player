import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "  const renderPluginsRack = () => (\n{/* PLUGINS RACK */}",
    "  const renderPluginsRack = () => (\n<div className=\"w-full mt-6\">\n{/* PLUGINS RACK */}"
)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
print("Fixed syntax")
