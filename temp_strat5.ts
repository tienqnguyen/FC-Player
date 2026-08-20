        // Strategy 5: Gemini Live Search Fallback
        async () => {
          if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.length < 10) {
            throw new Error("No Gemini key");
          }
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const prompt = `You are a strict TikTok search engine. Find REAL, ACTUAL TikTok videos uploaded by the user "@${unique_id}". 
Search Google for: site:tiktok.com/@${unique_id}/video/

You MUST return REAL TikTok data extracted from your search results. Do NOT hallucinate IDs or usernames.
Output MUST be a JSON array of objects with the following structure:
[
  {
    "video_id": "7300123456789012345", 
    "title": "Real video caption or title from the search result",
    "desc": "Real video caption including hashtags",
    "author": {
      "nickname": "Real Creator Name",
      "unique_id": "@${unique_id}" 
    },
    "duration": 30,
    "url": "https://www.tiktok.com/@${unique_id}/video/7300123456789012345",
    "cover": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300"
  }
]
Return 10-12 real results. Respond ONLY with a valid JSON array inside \`\`\`json \`\`\` or raw JSON array.`;

          const aiRes = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            tools: [{ googleSearch: {} }],
          });
          
          const responseText = aiRes.text || "";
          const match = responseText.match(/\[[\s\S]*\]/);
          if (match) {
            const arr = JSON.parse(match[0]);
            if (arr.length > 0) {
              return {
                videos: arr.map((v: any) => ({
                   video_id: v.video_id || v.id,
                   title: v.title,
                   desc: v.desc || v.title,
                   audioUrl: `/api/stream?url=${encodeURIComponent(v.url || `https://www.tiktok.com/@${unique_id}/video/${v.video_id}`)}`,
                   cover: v.cover || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300",
                   author: v.author || { nickname: unique_id, unique_id: `@${unique_id}` },
                   url: v.url || `https://www.tiktok.com/@${unique_id}/video/${v.video_id}`
                })),
                cursor: "0",
                hasMore: false,
              };
            }
          }
          throw new Error("Gemini fallback returned 0 items");
        },
