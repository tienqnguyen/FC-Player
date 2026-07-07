import { Client } from "@gradio/client";
import fs from "fs";
import fetch, { FormData, File, Blob } from "node-fetch";

async function run() {
  try {
    const client = await Client.connect("CohereLabs/cohere-transcribe-03-2026");
    const buffer = fs.readFileSync("audio_sample.wav");
    
    // polyfill for node-fetch
    class MyFile extends Blob {
        constructor(chunks, name, options) {
            super(chunks, options);
            this.name = name;
        }
        get [Symbol.toStringTag]() {
            return 'File';
        }
    }
    const file = new MyFile([buffer], "audio.wav", { type: "audio/wav" });
    
    // Instead of client.upload_files, do manual upload
    const formData = new FormData();
    formData.append("files", file, "audio.wav"); // Explicit filename!
    
    const uploadRes = await fetch(`${client.config.root}${client.api_prefix}/upload`, {
        method: "POST",
        body: formData
    });
    const uploadData = await uploadRes.json();
    console.log("Upload Data:", uploadData);
    
    const file_url = uploadData[0];
    const fileData = {
        path: file_url,
        orig_name: "audio.wav",
        url: file_url,
        meta: { _type: "gradio.FileData" }
    };
    
    const result = await client.predict("/transcribe", {
        audio_path: fileData,
        language: "en"
    });
    console.log("Result:", result.data);
    
  } catch (err) {
    console.error(err);
  }
}
run();
