const fs = require('fs');
async function run() {
  const fileBuffer = fs.readFileSync('public/favicon.svg'); // just a dummy file
  const blob = new Blob([fileBuffer]);
  const formData = new FormData();
  formData.append("audio_file", blob, "test.png");

  try {
    const res = await fetch("http://localhost:3000/api/stemmix", {
      method: "POST",
      body: formData
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (e) {
    console.error(e);
  }
}
run();
