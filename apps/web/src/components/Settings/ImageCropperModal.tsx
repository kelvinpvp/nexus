import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';
import { X, ZoomIn, ZoomOut, Check } from 'lucide-react';

interface ImageCropperModalProps {
  imageSrc: string;
  isAvatar?: boolean;
  onClose: () => void;
  onApply: (croppedBlob: Blob) => void;
}

export default function ImageCropperModal({ imageSrc, isAvatar = true, onClose, onApply }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      // 512x512 for Avatar, 1200x480 for Banner
      const outputWidth = isAvatar ? 512 : 1200;
      const outputHeight = isAvatar ? 512 : 480;
      
      const croppedBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        0,
        { horizontal: false, vertical: false },
        outputWidth,
        outputHeight
      );
      
      if (croppedBlob) {
        onApply(croppedBlob);
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao cortar a imagem');
    } finally {
      setIsProcessing(false);
    }
  };

  const aspect = isAvatar ? 1 : 1200 / 480;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-[#313338] w-full max-w-lg rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1F2023]">
          <h2 className="text-white text-lg font-bold">
            Editar {isAvatar ? 'Avatar' : 'Banner'}
          </h2>
          <button 
            onClick={onClose}
            className="text-[#B5BAC1] hover:text-[#DBDEE1] transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative w-full h-80 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={isAvatar ? 'round' : 'rect'}
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        {/* Controls */}
        <div className="p-4 space-y-6">
          <div className="flex items-center space-x-4">
            <ZoomOut size={20} className="text-[#949BA4]" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1.5 bg-[#4E5058] rounded-lg appearance-none cursor-pointer"
            />
            <ZoomIn size={20} className="text-[#949BA4]" />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-[#DBDEE1] hover:underline font-medium text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              disabled={isProcessing}
              className="flex items-center space-x-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-5 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={18} />
                  <span>Aplicar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
