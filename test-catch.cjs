const targetUrl = "/api/youtube/stream?v=xxx";
async function test() {
  try {
    const audioResponse = await fetch(targetUrl, { headers: {} });
  } catch (error) {
    console.error("CAUGHT!", error.message);
  }
}
test();
