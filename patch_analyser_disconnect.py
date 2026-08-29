with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

content = content.replace("n.drive.disconnect();", "n.drive.disconnect();\n    n.analyser.disconnect();")

with open('src/components/AudioEnhancer.tsx', 'w') as f:
    f.write(content)
print("Added analyser disconnect")
