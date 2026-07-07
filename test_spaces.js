import { client, handle_file } from '@gradio/client';
const spaces = ["akhaliq/demucs", "fabiocarrilho/demucs", "Monicall/Demucs", "yt16/Demucs", "vumichien/demucs"];
async function run() {
  for (const space of spaces) {
    try {
      const app = await client(space);
      console.log("SUCCESS:", space);
      return;
    } catch(e) {
      console.error("FAILED:", space, e.message);
    }
  }
}
run();
