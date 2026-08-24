import { StorageProvider } from './StorageProvider';
import { S3Client, HeadObjectCommand, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME || '';
    if (!this.bucketName) {
      throw new Error('S3_BUCKET_NAME is required for S3StorageProvider');
    }

    this.client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    });
  }

  async createUploadUrl(storageKey: string, mimeType: string, sizeBytes: number): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      ContentType: mimeType,
      ContentLength: sizeBytes,
    });
    
    // URL valid for 15 minutes to initiate the upload
    return await getSignedUrl(this.client, command, { expiresIn: 900 });
  }

  async createDownloadUrl(storageKey: string, expiresInSeconds: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });
    return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async verifyUpload(storageKey: string, expectedSizeBytes: number): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      });
      const response = await this.client.send(command);
      return response.ContentLength === expectedSizeBytes;
    } catch (e) {
      console.error(`verifyUpload failed for ${storageKey}:`, e);
      return false; // Object does not exist, or size mismatch, or access denied
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      });
      await this.client.send(command);
    } catch (e) {
      console.error(`deleteObject failed for ${storageKey}:`, e);
    }
  }
}
