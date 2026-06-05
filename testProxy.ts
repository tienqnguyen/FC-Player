import axios from "axios";
import crypto from "node:crypto";

const API_URL = "https://beta.nhaccuatui.com/api";
const PROXY_URL = "https://nct.napdev.workers.dev/";
const API_KEY = "e3afd4b6c89147258a56a641af16cc79";
const SECRET_KEY = "6847f1a4fc2f4eb6ab13f9084e082ef4";

// Note: when calling the proxy, we combine PROXY_URL + API_URL
const client = axios.create({
  baseURL: PROXY_URL + API_URL,
  params: {
    a: API_KEY,
  },
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
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
    console.log("POSTing via proxy to media/info with body:", body);
    const res = await client.post("media/info", body);
    console.log("PROXY Success! keys:", Object.keys(res.data));
    console.log("PROXY Data sample:", JSON.stringify(res.data, null, 2).substring(0, 2000));
  } catch (e: any) {
    console.error("PROXY error:", e.response?.status, e.response?.data || e.message);
  }
}
test();
