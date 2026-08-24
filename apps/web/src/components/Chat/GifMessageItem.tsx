import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

interface GifMessageItemProps {
  url: string;
}

export default function GifMessageItem({ url }: GifMessageItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [favId, setFavId] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Extract Provider and ID
  let provider = '';
  let providerGifId = '';

  if (url.includes('giphy.com/media')) {
    provider = 'GIPHY';
    const match = url.match(/media[0-9]?\.giphy\.com\/media\/(?:[a-zA-Z0-9-]+\/)?([a-zA-Z0-9]+)\//i);
    if (match && match[1]) {
      providerGifId = match[1];
    } else {
      // Fallback
      const parts = url.split('/');
      const gifIndex = parts.indexOf('giphy.gif');
      if (gifIndex > 0) {
        providerGifId = parts[gifIndex - 1];
      }
    }
  } else if (url.includes('tenor.com')) {
    provider = 'TENOR';
    const match = url.match(/-([a-zA-Z0-9]+)$/);
    if (match && match[1]) {
      providerGifId = match[1];
    }
  }

  const isGif = !!(provider && providerGifId);

  useEffect(() => {
    if (isGif) {
      checkFavorite();
    }
  }, [isGif, url]);

  const checkFavorite = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/gifs/favorites`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        const found = json.find((f: any) => f.provider === provider && f.providerGifId === providerGifId);
        if (found) {
          setIsFav(true);
          setFavId(found.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFavorite = async () => {
    try {
      if (isFav && favId) {
        const res = await fetch(`${apiUrl}/api/gifs/favorites/${favId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (res.ok) {
          setIsFav(false);
          setFavId(null);
        }
      } else {
        const res = await fetch(`${apiUrl}/api/gifs/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            provider,
            providerGifId,
            url,
            title: 'Saved from Chat'
          })
        });
        if (res.ok) {
          const json = await res.json();
          setIsFav(true);
          setFavId(json.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div 
      className="mt-1 max-w-sm rounded-lg overflow-hidden border border-[#1E1F22] relative group inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img src={url} alt="GIF/Imagem" className="w-full max-h-72 object-contain bg-black/20 block" loading="lazy" />
      
      {isGif && isHovered && (
        <div className="absolute top-2 right-2 flex items-start justify-end">
          <button 
            onClick={toggleFavorite}
            className="p-1.5 rounded bg-black/60 hover:bg-black/80 transition-colors"
            title={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Star 
              size={18} 
              className={isFav ? "fill-yellow-400 text-yellow-400" : "text-white"} 
            />
          </button>
        </div>
      )}
    </div>
  );
}
