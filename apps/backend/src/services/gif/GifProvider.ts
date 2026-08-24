export interface GifResult {
  id: string;
  provider: 'GIPHY' | 'TENOR';
  title: string;
  previewUrl: string;
  mediaUrl: string;
  width: number;
  height: number;
}

export interface GifProvider {
  search(query: string, limit?: number, offset?: number): Promise<GifResult[]>;
  trending(limit?: number, offset?: number): Promise<GifResult[]>;
}
