async function run() {
  const fileRoute = "https://tienqnguyen95-stemmix.hf.space/file=/tmp/gradio/test.wav";
  const apiFileRoute = "https://tienqnguyen95-stemmix.hf.space/gradio_api/file=/tmp/gradio/test.wav";

  try {
    console.log("Fetching /file=...");
    const res1 = await fetch(fileRoute);
    console.log("/file= status:", res1.status);
  } catch (err: any) {
    console.error("/file= failed:", err.message);
  }

  try {
    console.log("Fetching /gradio_api/file=...");
    const res2 = await fetch(apiFileRoute);
    console.log("/gradio_api/file= status:", res2.status);
  } catch (err: any) {
    console.error("/gradio_api/file= failed:", err.message);
  }
}
run();
