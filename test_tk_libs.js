import { Tiktok } from "@tobyg74/tiktok-api-dl";
import * as mrnima from "@mrnima/tiktok-downloader";

async function run() {
  console.log("tobyg74:", Object.keys(Tiktok || {}));
  console.log("mrnima:", Object.keys(mrnima || {}));
}
run();
