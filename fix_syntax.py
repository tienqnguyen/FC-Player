import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const renderPluginsRack = () => (\n{/* PLUGINS RACK */}",
    "const renderPluginsRack = () => (\n<div className=\"mt-6 w-full max-w-[95%] xl:max-w-[98%] mx-auto\">\n{/* PLUGINS RACK */}"
)

# And add the closing div
# I'll just find the line "    </div>\n  );\n" which I added, and make sure it's correct.
# Wait, let's just do a regex replace for the whole renderPluginsRack function.
