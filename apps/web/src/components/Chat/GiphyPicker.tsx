import React, { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface GiphyPickerProps {
  onSelectGif: (gifUrl: string) => void;
  onClose: () => void;
}

export default function GiphyPicker({ onSelectGif, onClose }: GiphyPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Tenor / Giphy API key publica ou Tenor endpoint gratuito
  const fetchGifs = async (query: string) => {
    setIsLoading(true);
    try {
      // Chave oficial fornecida pelo usuário
      const apiKey = 'UGC7H7FspGUjVvi15ztgkiajpOCFfBCL';
      const endpoint = query.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=24&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=g`;

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('API Rate Limited');
      const data = await res.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error('Error fetching GIFs:', err);
      // Secondary Klipy API fallback
      try {
        const fallbackRes = await fetch(
          query.trim()
            ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=LIVDSRZULEXM&limit=20`
            : `https://g.tenor.com/v1/trending?key=LIVDSRZULEXM&limit=20`
        );
        const fallbackData = await fallbackRes.json();
        if (fallbackData.results) {
          const formatted = fallbackData.results.map((item: any) => ({
            id: item.id,
            title: item.title || 'GIF',
            images: {
              fixed_height: {
                url: item.media?.[0]?.gif?.url || item.media?.[0]?.mediumgif?.url
              }
            }
          }));
          setGifs(formatted);
        }
      } catch (e) {
        console.error('Fallback failed:', e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGifs('');
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGifs(searchTerm);
  };

  return (
    <div className="w-80 h-96 bg-[#2B2D31] border border-[#1F2023] rounded-lg shadow-2xl flex flex-col overflow-hidden z-50">
      {/* Header / Search */}
      <div className="p-3 border-b border-[#1F2023] flex items-center space-x-2 bg-[#1E1F22]">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center bg-[#313338] px-2.5 py-1.5 rounded text-sm">
          <Search size={16} className="text-[#949BA4] mr-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar Tenor / GIF..."
            className="bg-transparent border-none outline-none text-[#DBDEE1] w-full text-xs placeholder-[#949BA4]"
          />
        </form>
        <button onClick={onClose} className="text-[#949BA4] hover:text-white p-1">
          <X size={18} />
        </button>
      </div>

      {/* GIFs Grid */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-[#949BA4]">
            <Loader2 size={24} className="animate-spin text-[#5865F2]" />
          </div>
        ) : gifs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#949BA4] text-xs">
            Nenhum GIF encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {gifs.map((gif) => {
              const url = gif.images?.fixed_height?.url || gif.images?.original?.url;
              return (
                <div
                  key={gif.id}
                  onClick={() => onSelectGif(url)}
                  className="h-28 bg-[#1E1F22] rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <img src={url} alt={gif.title} className="w-full h-full object-cover" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
