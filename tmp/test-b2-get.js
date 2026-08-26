
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
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
  });

  const command = new GetObjectCommand({
    Bucket: "nexus-uploads-k",
    Key: "test-cors-file.png",
  });

  const url = await getSignedUrl(client, command, { expiresIn: 900 });
  console.log("Presigned GET URL:", url);

  const res = await fetch(url);
  console.log("GET Status:", res.status);
  console.log("Body preview:", (await res.text()).substring(0, 200));
}

test().catch(console.error);

