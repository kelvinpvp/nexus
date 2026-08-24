import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

const client = new S3Client({
  endpoint: 'https://s3.us-east-005.backblazeb2.com',
  region: 'us-east-005',
  credentials: {
    accessKeyId: '00537eda03387590000000001',
    secretAccessKey: 'K005UsgrYuNxZqS0NZn7pbGkGPtI2sU',
  },
  forcePathStyle: false
});

const command = new PutBucketCorsCommand({
  Bucket: 'nexus-uploads-k',
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedOrigins: ['*'],
        ExposeHeaders: ['ETag']
      }
    ]
  }
});

client.send(command)
  .then(() => console.log('CORS set successfully via S3 API'))
  .catch(console.error);
