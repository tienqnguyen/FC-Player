async function testSpaces() {
  const spaces = ["PeachJed/Stemmix", "tienqnguyen95/Stemmix", "sociallyclever/demucs"];
  for (const space of spaces) {
    try {
      const url = `https://huggingface.co/api/spaces/${space}`;
      console.log(`Fetching: ${url}`);
      const res = await fetch(url);
      console.log(`Status for ${space}: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`Space name: ${data.id}`);
        console.log(`Status: ${data.runtime?.stage || 'unknown'}`);
        console.log(`Likes: ${data.likes}`);
      } else {
        console.log(`Error body: ${await res.text()}`);
      }
    } catch (e) {
      console.error(`Fetch failed for ${space}:`, e);
    }
  }
}

testSpaces();
