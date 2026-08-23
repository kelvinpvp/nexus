import { StorageProvider } from './StorageProvider';
import { v2 as cloudinary } from 'cloudinary';

export class CloudinaryStorageProvider implements StorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async saveFile(fileBuffer: Buffer, originalName: string, mimeType: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'nexus',
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result?.secure_url) return reject(new Error('No secure_url returned from Cloudinary'));
          resolve(result.secure_url);
        }
      );
      uploadStream.end(fileBuffer);
    });
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract public_id from Cloudinary URL
      // URL format: https://res.cloudinary.com/<cloud>/image/upload/v12345/nexus/<public_id>.<ext>
      const match = fileUrl.match(/\/v\d+\/(nexus\/[^.]+)/);
      if (match && match[1]) {
        await cloudinary.uploader.destroy(match[1]);
      }
    } catch (err) {
      console.error('Error deleting file from Cloudinary:', err);
    }
  }
}
