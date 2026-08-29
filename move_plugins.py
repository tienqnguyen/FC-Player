import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

plugins_start = content.find("{/* PLUGINS RACK */}")
plugins_end = content.find("{/* MASTER FX */}")

if plugins_start != -1 and plugins_end != -1:
    plugins_block = content[plugins_start:plugins_end]
    # Remove it from its current position
    content = content[:plugins_start] + content[plugins_end:]
    
    # We want to insert it after the Original Audio Preview inside the idle state, 
    # AND keep it in the ready state? 
    # Actually, why not put it OUTSIDE the ternary entirely, so it's always at the bottom?
    # The ternary ends around line 5630.
    
    print("Found plugins block")
else:
    print("Could not find plugins block")
