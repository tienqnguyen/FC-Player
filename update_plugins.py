import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

plugins_start = content.find("{/* PLUGINS RACK */}")
plugins_end = content.find("{/* MASTER FX */}")

if plugins_start != -1 and plugins_end != -1:
    plugins_block = content[plugins_start:plugins_end]
    content = content[:plugins_start] + content[plugins_end:]
    
    # We will inject renderPluginsRack() near the top of StemStudio component
    # We need to find a good spot, maybe before the return (
    
    render_func = """
  const renderPluginsRack = () => (
""" + plugins_block.replace("          {/* PLUGINS RACK */}", "    <div className=\"mt-6 w-full max-w-[95%] xl:max-w-[98%] mx-auto\">\n      {/* PLUGINS RACK */}").replace("          <div", "      <div").rstrip() + "\n    </div>\n  );\n"

    return_idx = content.rfind("return (")
    if return_idx != -1:
        content = content[:return_idx] + render_func + "\n  " + content[return_idx:]
    
    # Now inject {renderPluginsRack()} inside the idle state (after Original Audio Preview)
    # and in the ready state (before MASTER FX)
    
    # 1. Ready state: before MASTER FX
    master_fx_idx = content.find("{/* MASTER FX */}")
    if master_fx_idx != -1:
        content = content[:master_fx_idx] + "{renderPluginsRack()}\n          " + content[master_fx_idx:]
        
    # 2. Idle state: after original Audio preview
    # Look for "Original Audio Preview & Tools"
    preview_idx = content.find("{/* PREVIEW & TRANSCRIPT SECTION */}")
    if preview_idx != -1:
        # We need to insert it after the preview container closes.
        # It's a bit tricky to find the closing div of the preview.
        # We can just put it right before {stemmixStatus !== "ready" ? ... ends}
        pass
        
    with open('src/components/StemStudio.tsx', 'w') as f:
        f.write(content)
    print("Injected renderPluginsRack")
else:
    print("Could not find plugins block")
