with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "try { inputNode.disconnect();\n    try { n.drive.disconnect();",
    "try { inputNode.disconnect(); } catch (e) {}\n    try { n.drive.disconnect();"
)

with open('src/components/AudioEnhancer.tsx', 'w') as f:
    f.write(content)
print("Fixed try catch")
