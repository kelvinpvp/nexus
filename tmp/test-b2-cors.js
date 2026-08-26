
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

async function test() {
  const client = new S3Client({
    region: "us-east-005",
    endpoint: "https://s3.us-east-005.backblazeb2.com",
    credentials: {
      accessKeyId: "00537eda03387590000000001",
      secretAccessKey: "K005UsgrYuNxZqS0NZn7pbGkGPtI2sU",
    },
    forcePathStyle: false,
    requestChecksumCalculation: "WHEN_REQUIRED"
  });

  const command = new PutObjectCommand({
    Bucket: "nexus-uploads-k",
    Key: "test-cors-file.png",
    ContentType: "image/png"
  });

  const url = await getSignedUrl(client, command, { expiresIn: 900 });
  console.log("Presigned URL:", url);

  const res = await fetch(url, {
    method: "OPTIONS",
    headers: {
      "Origin": "http://tauri.localhost",
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "Content-Type"
    }
  });

  console.log("OPTIONS Status:", res.status);
  console.log("OPTIONS Headers:");
  for (const [key, value] of res.headers.entries()) {
    console.log(`  ${key}: ${value}`);
  }
}

test().catch(console.error);

