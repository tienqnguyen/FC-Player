with open("src/components/StemStudio.tsx", "r") as f:
    content = f.read()

bad_jsx = """                             {stem === 'vocals' && (
                                <button
                                   onClick={handleGenerateSubtitles}"""
                                   
good_jsx = """                             {stem === 'vocals' && (
                                <>
                                <button
                                   onClick={handleGenerateSubtitles}"""
                                   
bad_jsx_2 = """                                </button>
                             )}"""
                             
good_jsx_2 = """                                </button>
                                </>
                             )}"""

content = content.replace(bad_jsx, good_jsx).replace(bad_jsx_2, good_jsx_2)

with open("src/components/StemStudio.tsx", "w") as f:
    f.write(content)
