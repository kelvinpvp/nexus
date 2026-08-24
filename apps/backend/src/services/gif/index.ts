import { GifProvider } from './GifProvider';
import { GiphyGifProvider } from './GiphyGifProvider';

export function getGifProvider(): GifProvider {
  const providerType = process.env.GIF_PROVIDER?.toUpperCase() || 'GIPHY';
  
  if (providerType === 'TENOR') {
    // Return TenorProvider here in the future
    // return new TenorGifProvider();
    throw new Error('TenorProvider not fully implemented or verified yet.');
  }

  return new GiphyGifProvider();
}
