import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testUpload() {
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-005',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true'
  });

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME || 'nexus-uploads-k',
    Key: 'profiles/test_image.webp',
    ContentType: 'image/webp',
  });

  console.log('Generating presigned URL...');
  const url = await getSignedUrl(client, command, { expiresIn: 900 });
  console.log('URL:', url);

  try {
    console.log('Uploading mock data with fetch...');
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/webp'
      },
      body: Buffer.alloc(100)
    });
    console.log('Success!', res.status);
    if (!res.ok) console.log(await res.text());
  } catch (err: any) {
    console.error('Upload failed!', err);
  }
}

testUpload();
