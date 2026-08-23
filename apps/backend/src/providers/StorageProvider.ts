export interface StorageProvider {
  /**
   * Saves a file and returns its public URL or access path
   */
  saveFile(file: Buffer, fileName: string, mimeType: string): Promise<string>;
  
  /**
   * Deletes a file by its URL or path
   */
  deleteFile(fileUrl: string): Promise<void>;
}
