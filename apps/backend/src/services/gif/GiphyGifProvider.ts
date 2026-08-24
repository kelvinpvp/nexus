import { GifProvider, GifResult } from './GifProvider';
import axios from 'axios';

export class GiphyGifProvider implements GifProvider {
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.GIPHY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('GIPHY_API_KEY is missing');
    }
  }

  private normalize(data: any): GifResult {
    return {
      id: data.id,
      provider: 'GIPHY',
      title: data.title || '',
      previewUrl: data.images?.fixed_height_small?.url || data.images?.original?.url,
      mediaUrl: data.images?.original?.url,
      width: parseInt(data.images?.original?.width || '0', 10),
      height: parseInt(data.images?.original?.height || '0', 10),
    };
  }

  async search(query: string, limit: number = 20, offset: number = 0): Promise<GifResult[]> {
    if (!this.apiKey) return [];
    try {
      const response = await axios.get('https://api.giphy.com/v1/gifs/search', {
        params: {
          api_key: this.apiKey,
          q: query,
          limit,
          offset,
          rating: 'pg-13'
        }
      });
      return (response.data?.data || []).map((i: any) => this.normalize(i));
    } catch (e) {
      console.error('GIPHY search error:', e);
      return [];
    }
  }

  async trending(limit: number = 20, offset: number = 0): Promise<GifResult[]> {
    if (!this.apiKey) return [];
    try {
      const response = await axios.get('https://api.giphy.com/v1/gifs/trending', {
        params: {
          api_key: this.apiKey,
          limit,
          offset,
          rating: 'pg-13'
        }
      });
      return (response.data?.data || []).map((i: any) => this.normalize(i));
    } catch (e) {
      console.error('GIPHY trending error:', e);
      return [];
    }
  }
}
