with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

lines = content.split('\n')
for i, line in enumerate(lines):
    if '{stemUrls && (' in line and i > 4000:
        print(f"Line {i}: {line}")
