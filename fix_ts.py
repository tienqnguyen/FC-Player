import re

with open('src/components/AudioEnhancer.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const Knob = ({ label, value, onChange, min = 0, max = 100, unit = '' }) => {",
    "const Knob = ({ label, value, onChange, min = 0, max = 100, unit = '' }: any) => {"
)

content = content.replace(
    "const VerticalSlider = ({ label, value, onChange, min = -100, max = 100 }) => {",
    "const VerticalSlider = ({ label, value, onChange, min = -100, max = 100 }: any) => {"
)

content = content.replace(
    "const SectionHeader = ({ title, power, setPower }) => (",
    "const SectionHeader = ({ title, power, setPower }: any) => ("
)

with open('src/components/AudioEnhancer.tsx', 'w') as f:
    f.write(content)
print("Fixed TS")
