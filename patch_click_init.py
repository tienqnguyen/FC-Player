with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "onClick={() => setShowAudioEnhancer(true)}",
    "onClick={() => {\n                        if (!initAttemptedRef.current) initAudio();\n                        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();\n                        setShowAudioEnhancer(true);\n                      }}"
)

with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
print("Patched click to init audio")
