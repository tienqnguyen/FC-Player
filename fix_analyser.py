with open('src/components/AudioEnhancer.tsx', 'r') as f:
    lines = f.readlines()

with open('src/components/AudioEnhancer.tsx', 'w') as f:
    for line in lines:
        if line.strip() == "analyser.disconnect(); } catch (e) {}":
            # This is the line we want to skip/remove, because we already added `n.analyser.disconnect();` later.
            continue
        f.write(line)

print("Fixed")
