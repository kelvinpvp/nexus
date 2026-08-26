
const { execFileSync } = require("child_process");
const fs = require("fs");

const corsRules = [
  {
    corsRuleName: "nexus-web",
    allowedOrigins: [
      "https://nexus-web-smoky-three.vercel.app",
      "http://localhost:3000",
      "http://tauri.localhost",
      "https://tauri.localhost",
      "https://*",
      "http://*"
    ],
    allowedHeaders: ["*"],
    allowedOperations: [
      "s3_head",
      "b2_download_file_by_id",
      "b2_upload_part",
      "b2_upload_file",
      "s3_put",
      "b2_download_file_by_name",
      "s3_post",
      "s3_get"
    ],
    exposeHeaders: ["etag"],
    maxAgeSeconds: 86400
  }
];

const env = { ...process.env, B2_APPLICATION_KEY_ID: "00537eda03387590000000001", B2_APPLICATION_KEY: "K005UsgrYuNxZqS0NZn7pbGkGPtI2sU" };

try {
  const result = execFileSync("b2.exe", ["bucket", "update", "--cors-rules", JSON.stringify(corsRules), "nexus-uploads-k", "allPrivate"], { env, encoding: "utf8" });
  console.log("Success:", result);
} catch (e) {
  console.error("Error:", e.stdout, e.stderr, e.message);
}

