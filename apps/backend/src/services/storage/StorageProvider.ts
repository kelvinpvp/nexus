export interface StorageProvider {
  /**
   * Generates a pre-signed URL for the client to directly upload the file to storage.
   * Returns the presigned upload URL.
   */
  createUploadUrl(storageKey: string, mimeType: string, sizeBytes: number): Promise<string>;

  /**
   * Generates a pre-signed URL for a client to download/read the file from storage.
   * This URL should be temporary.
   */
  createDownloadUrl(storageKey: string, expiresInSeconds: number): Promise<string>;

  /**
   * Validates if an object exists and matches expected metadata (size).
   * Returns true if valid, false otherwise.
   */
  verifyUpload(storageKey: string, expectedSizeBytes: number): Promise<boolean>;

  /**
   * Deletes an object from storage permanently.
   */
  deleteObject(storageKey: string): Promise<void>;
}
