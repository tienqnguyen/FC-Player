import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# 1. Extract renderPluginsRack
start_idx = content.find("  const renderPluginsRack = () => (")
end_idx = content.find("  );", start_idx) + 4
if start_idx != -1 and end_idx != -1:
    plugins_func = content[start_idx:end_idx]
    # Remove it from the incorrect place
    content = content[:start_idx] + content[end_idx:]
    
    # 2. Find the real top-level return (
    # The real top-level return is usually where `return (` is unindented or indented by 2 spaces.
    # Let's search for "\n  return (\n"
    real_return_idx = content.find("\n  return (")
    if real_return_idx != -1:
        content = content[:real_return_idx] + "\n" + plugins_func + "\n" + content[real_return_idx:]
        with open('src/components/StemStudio.tsx', 'w') as f:
            f.write(content)
        print("Moved renderPluginsRack successfully.")
    else:
        print("Could not find real return (")
else:
    print("Could not find renderPluginsRack")
