import axios from "axios";
import crypto from "node:crypto";

const API_URL = "https://beta.nhaccuatui.com/api";
const API_KEY = "e3afd4b6c89147258a56a641af16cc79";
const SECRET_KEY = "6847f1a4fc2f4eb6ab13f9084e082ef4";

const client = axios.create({
  baseURL: API_URL,
  params: {
    a: API_KEY,
  },
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  }
});

client.interceptors.request.use((config: any) => {
  const now = String(Date.now());
  const hash = crypto.createHmac("sha512", SECRET_KEY).update(now).digest("hex");
  config.params.t = now;
  config.params.s = hash;
  return config;
});

const joinQueryString = (obj: { [key: string]: any }) =>
  Object.entries(obj)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join("&");

async function test() {
  try {
    const playlistKey = "lQ61iLbyjGq7";
    const body = joinQueryString({ key: playlistKey, type: "playlist" });
    const res = await client.post("media/info", body);
    console.log("Success! Response status:", res.status);
    console.log("Content-Type:", res.headers["content-type"]);
    console.log("Data sample:", String(res.data).substring(0, 1000));
  } catch (e: any) {
    console.error("API error status:", e.response?.status);
    console.error("API error headers:", e.response?.headers);
    console.error("API error data sample:", String(e.response?.data).substring(0, 500));
  }
}
test();
