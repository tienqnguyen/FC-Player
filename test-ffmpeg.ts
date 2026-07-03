import { spawn } from "child_process";

const url = "https://peachjed-stemmix.hf.space/gradio_api/file=/tmp/gradio/d758055b98877ed4f98cce272abcc2623958f3728a2cd927925ec87914f7d678/drums.wav";

async function transcode() {
    console.log("Starting...");
    const start = Date.now();
    const ffmpeg = spawn("ffmpeg", [
        "-i", url,
        "-c:a", "libmp3lame",
        "-b:a", "128k",
        "-f", "mp3",
        "pipe:1"
    ]);

    let chunks = [];
    ffmpeg.stdout.on("data", (chunk) => {
        chunks.push(chunk);
    });

    ffmpeg.on("close", (code) => {
        const buffer = Buffer.concat(chunks);
        console.log("Done in", Date.now() - start, "ms. Size:", buffer.length);
    });
}
transcode();
