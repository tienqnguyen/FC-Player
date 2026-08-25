with open('server.ts', 'r') as f:
    content = f.read()

target = """            audioUrl:
              "/api/proxy-stream?url=https%3A%2F%2Fstream.nct.vn%2Fresa%2F2605%2Fa4%2F52%2F96myxlw2bg.mp3%3Fst%3DG5iXoDQWnWgHmtXbfr2ucQ%26e%3D1781276871%26a%3D6%26p%3D0%26r%3D885ad4649ef1d80dd7233f228343a253","""
replacement = """            audioUrl: "https://stream.nct.vn/resa/2605/a4/52/96myxlw2bg.mp3?st=G5iXoDQWnWgHmtXbfr2ucQ&e=1781276871&a=6&p=0&r=885ad4649ef1d80dd7233f228343a253","""
content = content.replace(target, replacement)

with open('server.ts', 'w') as f:
    f.write(content)
print("Finished replacements")
