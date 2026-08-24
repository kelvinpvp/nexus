import { StorageProvider } from './StorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';
import { S3StorageProvider } from './S3StorageProvider';

let providerInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (providerInstance) return providerInstance;

  const providerType = process.env.STORAGE_PROVIDER || 'local';

  if (providerType === 's3' || providerType === 'r2') {
    if (!process.env.S3_BUCKET_NAME || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
      throw new Error(`STORAGE_PROVIDER is ${providerType}, but S3 credentials are missing.`);
    }
    providerInstance = new S3StorageProvider();
  } else if (providerType === 'local') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('LocalStorageProvider should not be used in production.');
    }
    providerInstance = new LocalStorageProvider();
  } else {
    throw new Error(`Unknown STORAGE_PROVIDER: ${providerType}`);
  }

  return providerInstance;
}
