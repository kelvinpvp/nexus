import { StorageProvider } from './StorageProvider';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const statAsync = promisify(fs.stat);
const unlinkAsync = promisify(fs.unlink);

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export class LocalStorageProvider implements StorageProvider {
  // In development, the local dev server runs on localhost:3001
  private baseUrl = process.env.API_URL || 'http://localhost:3001';

  async createUploadUrl(storageKey: string, mimeType: string, sizeBytes: number): Promise<string> {
    // For local dev, we return a URL pointing to our own Fastify backend /api/local-storage/upload route
    // We pass the storageKey as a query param or path param.
    // NOTE: This route will ONLY exist if STORAGE_PROVIDER=local
    return `${this.baseUrl}/api/local-storage/upload?key=${encodeURIComponent(storageKey)}`;
  }

  async createDownloadUrl(storageKey: string, expiresInSeconds: number): Promise<string> {
    // Return a temporary URL with an expiry param (simulating presigned download)
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    return `${this.baseUrl}/api/local-storage/download?key=${encodeURIComponent(storageKey)}&expires=${expiresAt}`;
  }

  async verifyUpload(storageKey: string, expectedSizeBytes: number): Promise<boolean> {
    try {
      const filePath = path.join(UPLOAD_DIR, storageKey);
      const stats = await statAsync(filePath);
      return stats.size === expectedSizeBytes;
    } catch (e) {
      return false; // File doesn't exist or error reading stats
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    try {
      const filePath = path.join(UPLOAD_DIR, storageKey);
      await unlinkAsync(filePath);
    } catch (e) {
      console.error(`Failed to delete local object ${storageKey}:`, e);
    }
  }
}
