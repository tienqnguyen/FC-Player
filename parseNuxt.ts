import fs from "node:fs/promises";

async function test() {
  const fileContent = await fs.readFile("nuxt_data.json", "utf-8");
  const data = JSON.parse(fileContent);

  console.log("Analyzing data...");

  // Let's find all instances of strings ending in .mp3 or .m4a or containing audio stream URLs
  const audioUrls = data.filter((item: any) => typeof item === "string" && (item.includes(".mp3") || item.includes(".m4a") || item.includes("stream")));
  console.log("Audio-like URLs:", audioUrls);

  // Let's find all strings that look like NCT song keys (usually 12 alphanumeric characters, starting with some letters/numbers)
  // Let's inspect standard strings in the data array
  console.log("\nSome sample strings in nuxt_data.json:");
  const sampleStrings = data.filter((item: any) => typeof item === "string" && item.length > 5 && item.length < 30);
  console.log(sampleStrings.slice(0, 30));

  // Let's find if "song" or "list" or similar keys are mapped
  const occurrencesOfPlaylist = data.reduce((acc: number[], item: any, idx: number) => {
    if (typeof item === "string" && (item === "playlist" || item === "song")) {
      acc.push(idx);
    }
    return acc;
  }, []);
  console.log("Indices for 'playlist' or 'song' type:", occurrencesOfPlaylist);
}
test();
