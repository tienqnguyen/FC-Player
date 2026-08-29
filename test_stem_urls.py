with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

idx = content.find("PLUGINS RACK")
if idx != -1:
    before = content[max(0, idx-500):idx]
    after = content[idx:idx+200]
    print(before)
    print("-------")
    print(after)
