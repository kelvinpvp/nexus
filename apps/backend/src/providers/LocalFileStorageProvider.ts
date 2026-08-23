import { StorageProvider } from './StorageProvider';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

export class LocalFileStorageProvider implements StorageProvider {
  private uploadDir: string;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:4000/uploads') {
    this.uploadDir = path.join(__dirname, '../../uploads');
    this.baseUrl = baseUrl;

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(fileBuffer: Buffer, originalName: string, mimeType: string): Promise<string> {
    const ext = path.extname(originalName) || this.getExtensionFromMime(mimeType);
    const uniqueName = crypto.randomUUID() + ext;
    const filePath = path.join(this.uploadDir, uniqueName);

    await fs.promises.writeFile(filePath, fileBuffer);

    return `${this.baseUrl}/${uniqueName}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl.startsWith(this.baseUrl)) return;
    
    const fileName = fileUrl.replace(`${this.baseUrl}/`, '');
    // Prevent path traversal
    const safePath = path.normalize(fileName).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(this.uploadDir, safePath);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  private getExtensionFromMime(mime: string): string {
    switch (mime) {
      case 'image/jpeg': return '.jpg';
      case 'image/png': return '.png';
      case 'image/gif': return '.gif';
      case 'image/webp': return '.webp';
      default: return '';
    }
  }
}
