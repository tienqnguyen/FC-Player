import re

with open('src/components/StemStudio.tsx', 'r') as f:
    content = f.read()

# First, remove it from the "idle" block (around 5123-5135)
to_remove_idle = """                           { (cohereTranscript || isTranscribing) && (
                              <div className="w-full text-left mt-2 border-t border-white/5 pt-4">
                                 {subtitlesUI}
                              </div>
                           )}

                           <div className="w-full text-left">
                                 {sunoLyricUI}
                                 {phoiKhiLyricUI}
                           </div>"""

if to_remove_idle in content:
    content = content.replace(to_remove_idle, "")
    print("Removed from idle block")
else:
    print("Could not find idle block")

# Next, remove it from the "ready" block (around 5673-5680)
to_remove_ready = """                                     {sunoLyricUI}
                                 {phoiKhiLyricUI}
          
          {subtitlesUI}"""

if to_remove_ready in content:
    content = content.replace(to_remove_ready, "")
    print("Removed from ready block")
else:
    print("Could not find ready block")

# Finally, insert it at the very bottom
bottom_target = """             </div>
          </div>
          </>
         )}
       </div>

       <AudioEnhancer """

bottom_insert = """             </div>
          </div>
          </>
         )}

         {/* LYRICS & TRANSCRIPT - MOVED TO BOTTOM */}
         <div className="flex flex-col w-full gap-4 pt-4 border-t border-white/5">
             {subtitlesUI}
             {sunoLyricUI}
             {phoiKhiLyricUI}
         </div>

       </div>

       <AudioEnhancer """

if bottom_target in content:
    content = content.replace(bottom_target, bottom_insert)
    print("Inserted at bottom")
else:
    print("Could not find bottom target")
    # let's try a more robust target
    target2 = "       </div>\n\n       <AudioEnhancer "
    if target2 in content:
        content = content.replace(target2, "         {/* LYRICS & TRANSCRIPT - MOVED TO BOTTOM */}\n         <div className=\"flex flex-col w-full gap-4 pt-4 border-t border-white/5\">\n             {subtitlesUI}\n             {sunoLyricUI}\n             {phoiKhiLyricUI}\n         </div>\n       </div>\n\n       <AudioEnhancer ")
        print("Inserted at bottom (fallback)")
    else:
        print("Could not find bottom target fallback either")


with open('src/components/StemStudio.tsx', 'w') as f:
    f.write(content)
