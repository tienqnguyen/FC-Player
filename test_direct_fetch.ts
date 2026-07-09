async function run() {
  try {
    console.log("Directly fetching hf space config...");
    const res = await fetch("https://tienqnguyen95-stemmix.hf.space/config");
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Config text slice:", text.slice(0, 300));
  } catch (err: any) {
    console.error("Direct fetch failed:", err.message);
  }
}
run();
