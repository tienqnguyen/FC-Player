import { Client } from "@gradio/client";

export async function transcribeWithRNNT(audioUrl: string): Promise<string> {
    try {
        const client = await Client.connect("hkab/vietnamese-rnnt-demo");
        
        // Fetch the blob from the URL
        const response = await fetch(audioUrl);
        const blob = await response.blob();
        const file = new File([blob], "audio.wav", { type: "audio/wav" });
        
        // Manually upload to bypass gradio/client Blob downcasting bug that drops the .wav extension
        const formData = new FormData();
        formData.append("files", file, "audio.wav"); // explicit filename
        
        const uploadRes = await fetch(`${client.config.root}${client.api_prefix}/upload`, {
            method: "POST",
            body: formData
        });
        
        if (!uploadRes.ok) {
             throw new Error(`Upload failed with status ${uploadRes.status}`);
        }
        
        const uploadData = await uploadRes.json();
        const file_url = uploadData[0];
        
        const fileData = {
            path: file_url,
            orig_name: "audio.wav",
            url: file_url,
            meta: { _type: "gradio.FileData" }
        };
        
        const result = await client.predict("/process_uploaded_file", { 
            in_filename: fileData, 
            model_type: "FP32", 
        });
        
        return result.data[0] as string;
    } catch (e) {
        console.error("RNNT transcription error", e);
        throw e;
    }
}
