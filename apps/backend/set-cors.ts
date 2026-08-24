import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-005',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true'
});

const command = new PutBucketCorsCommand({
  Bucket: process.env.S3_BUCKET_NAME || 'nexus-uploads-k',
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
  .then(() => console.log('✅ CORS configurado com sucesso no S3/B2!'))
  .catch(err => {
    console.error('❌ Falha ao configurar CORS:');
    console.error(err);
  });
