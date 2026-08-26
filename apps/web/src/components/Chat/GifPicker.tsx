import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface GifResult {
  id: string;
  provider: string;
  title: string;
  previewUrl: string;
  mediaUrl: string;
  width: number;
  height: number;
  url?: string;
  providerGifId?: string;
}

interface GifPickerProps {
  onSelectGif: (gif: { url: string; width: number; height: number; provider: string; providerGifId: string; title: string }) => void;
  onClose: () => void;
}

export default function GifPicker({ onSelectGif, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'trending' | 'search' | 'favorites'>('trending');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [favorites, setFavorites] = useState<GifResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  
  const fetchGifs = async (endpoint: string, q?: string) => {
    setIsLoading(true);
    setError('');
    try {
      const url = new URL(`${apiUrl}${endpoint}`);
      if (q) url.searchParams.append('q', q);
      
      const res = await fetch(url.toString(), { credentials: 'include' });
      if (!res.ok) throw new Error('Falha ao carregar GIFs');
      const json = await res.json();
      
      // /api/gifs/favorites returns an array, others return { data: array }
      if (endpoint === '/api/gifs/favorites') {
        setGifs(json);
        setFavorites(json);
      } else {
        setGifs(json.data || []);
      }
    } catch (e: any) {
      setError(e.message || 'Erro');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/gifs/favorites`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setFavorites(json);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  useEffect(() => {
    if (activeTab === 'trending') {
      fetchGifs('/api/gifs/trending');
    } else if (activeTab === 'favorites') {
      fetchGifs('/api/gifs/favorites');
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'search') {
      if (!query.trim()) {
        setGifs([]);
        return;
      }
      
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        fetchGifs('/api/gifs/search', query);
      }, 500);
    }
  }, [query, activeTab]);

  const toggleFavorite = async (e: React.MouseEvent, gif: GifResult) => {
    e.stopPropagation();
    const isFav = favorites.some((f) => f.providerGifId === (gif.providerGifId || gif.id));
    
    try {
      if (isFav) {
        // Find favorite ID
        const favObj = favorites.find(f => f.providerGifId === (gif.providerGifId || gif.id));
        if (favObj && favObj.id) {
          const res = await fetch(`${apiUrl}/api/gifs/favorites/${favObj.id}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          if (res.ok) {
            setFavorites(prev => prev.filter(f => f.id !== favObj.id));
            if (activeTab === 'favorites') {
              setGifs(prev => prev.filter(f => f.id !== favObj.id));
            }
          }
        }
      } else {
        const res = await fetch(`${apiUrl}/api/gifs/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            provider: gif.provider,
            providerGifId: gif.id, // we use the gif.id from provider as providerGifId
            url: gif.mediaUrl,
            previewUrl: gif.previewUrl,
            width: gif.width,
            height: gif.height,
            title: gif.title
          })
        });
        if (res.ok) {
          const json = await res.json();
          // Add to favorites
          setFavorites(prev => [json, ...prev]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col w-full h-[400px] rounded-2xl shadow-2xl border border-white/8 bg-[linear-gradient(180deg,#0c1426_0%,#0b1020_100%)]">
      {/* Search Input */}
      <div className="p-3 border-b border-white/6">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar GIFs..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveTab('search');
            }}
            className="w-full bg-[#09111f] text-white rounded-xl px-3 py-2 pl-9 focus:outline-none focus:ring-1 focus:ring-cyan-300/50 text-sm border border-white/8"
          />
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex px-3 border-b border-white/6">
        <button 
          onClick={() => { setActiveTab('trending'); setQuery(''); }} 
          className={`flex-1 text-xs py-2 uppercase font-bold transition-colors ${activeTab === 'trending' ? 'text-cyan-200 border-b-2 border-cyan-300' : 'text-slate-400 hover:text-slate-100'}`}
        >
          Em Alta
        </button>
        <button 
          onClick={() => { setActiveTab('favorites'); setQuery(''); }} 
          className={`flex-1 text-xs py-2 uppercase font-bold transition-colors ${activeTab === 'favorites' ? 'text-cyan-200 border-b-2 border-cyan-300' : 'text-slate-400 hover:text-slate-100'}`}
        >
          Favoritos
        </button>
      </div>

      {/* Gif Grid */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-slate-400" size={24} />
          </div>
        )}

        {!isLoading && error && (
          <div className="flex items-center justify-center h-full text-rose-300 text-sm font-medium">
            {error}
          </div>
        )}

        {!isLoading && !error && gifs.length === 0 && (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Nenhum GIF encontrado.
          </div>
        )}

        {!isLoading && !error && gifs.length > 0 && (
          <div className="columns-2 gap-2 space-y-2">
            {gifs.map((gif, index) => {
              const isFav = favorites.some((f) => f.providerGifId === (gif.providerGifId || gif.id));
              
              return (
                <div 
                  key={`${gif.id}-${index}`}
                  className="relative group cursor-pointer overflow-hidden rounded-xl bg-[#09111f] border border-white/6"
                  onClick={() => {
                    onSelectGif({
                      url: gif.mediaUrl || gif.url || '', // Favorites API returns .url
                      width: gif.width,
                      height: gif.height,
                      provider: gif.provider,
                      providerGifId: gif.providerGifId || gif.id,
                      title: gif.title
                    });
                    onClose();
                  }}
                >
                  <img 
                    src={gif.previewUrl || gif.mediaUrl || gif.url} 
                    alt={gif.title} 
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2">
                    <button 
                      onClick={(e) => toggleFavorite(e, gif)}
                      className="p-1.5 rounded bg-black/60 hover:bg-black/80 transition-colors"
                      title={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                      <Star 
                        size={16} 
                        className={isFav ? "fill-yellow-400 text-yellow-400" : "text-white"} 
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
