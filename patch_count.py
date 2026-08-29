with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

old_count = '<span className="text-[9px] font-mono font-medium text-white/30">1 Active</span>'
new_count = '<span className="text-[9px] font-mono font-medium text-white/30">{1 + (active8D ? 1 : 0) + (activeBassBoost ? 1 : 0) + (activeSpeedFx ? 1 : 0)} Active</span>'

content = content.replace(old_count, new_count)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
print("Patched count")
