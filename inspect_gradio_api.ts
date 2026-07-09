import { client } from "@gradio/client";

async function run() {
  try {
    console.log("Connecting to Gradio space: tienqnguyen95/Stemmix...");
    const hfApp = await client("tienqnguyen95/Stemmix" as any);
    
    console.log("\n--- Connection Successful! ---");
    console.log("Config keys:", Object.keys(hfApp.config || {}));
    
    if (hfApp.config && hfApp.config.dependencies) {
      console.log("\nDependencies endpoints list:");
      hfApp.config.dependencies.forEach((dep: any, idx: number) => {
        console.log(`Endpoint #${idx}: api_name=${dep.api_name}, show_api=${dep.show_api}`);
        console.log(`  inputs:`, JSON.stringify(dep.inputs, null, 2));
        console.log(`  outputs:`, JSON.stringify(dep.outputs, null, 2));
      });
    } else {
      console.log("No dependencies found in config.");
    }
  } catch (err: any) {
    console.error("API Inspection failed:", err.message);
  }
}

run();
