with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const [showAudioEnhancer, setShowAudioEnhancer] = useState<boolean>(false);",
    "const [showAudioEnhancer, setShowAudioEnhancer] = useState<boolean>(false);\n  const [audioNodesReady, setAudioNodesReady] = useState<boolean>(false);"
)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
print("Patched state variable")
