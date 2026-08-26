import { useState, useRef, ClipboardEvent, ChangeEvent } from 'react';
import { PlusCircle, Smile, Send, X, File as FileIcon } from 'lucide-react';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import GifPicker from './GifPicker';
import { useUploadStore } from '@/store/uploadStore';

interface MessageInputProps {
  placeholder: string;
  contextId: string;
  contextType: 'SERVER_CHANNEL' | 'DIRECT_MESSAGE';
  onSendMessage: (content: string, attachmentIds: string[]) => Promise<void>;
}

export default function MessageInput({ placeholder, contextId, contextType, onSendMessage }: MessageInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploads, addUploads, removeUpload, clearUploads, startUploads } = useUploadStore();
  const currentUploads = uploads[contextId] || [];

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      addUploads(contextId, Array.from(e.clipboardData.files));
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addUploads(contextId, Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;
    if (!inputValue.trim() && currentUploads.length === 0) return;

    setIsSending(true);
    const content = inputValue.trim();
    
    // Optimistic UI could clear input immediately, but since we upload, we wait or we can clear
    setInputValue('');

    try {
      let attachmentIds: string[] = [];
      if (currentUploads.length > 0) {
        attachmentIds = await startUploads(contextId, contextType);
      }
      
      // If uploads failed partially or fully, we might still have some, but let's send what succeeded
      // A better UX would stop if error, but this is a V1
      const failed = useUploadStore.getState().uploads[contextId]?.filter(u => u.status === 'ERROR') || [];
      if (failed.length > 0) {
        // Restore input so user can try again
        setInputValue(content);
        setIsSending(false);
        return; // Stop here so user sees the red errors on files
      }

      if (content || attachmentIds.length > 0) {
        await onSendMessage(content, attachmentIds);
        clearUploads(contextId);
      }
    } catch (error) {
      console.error('Send error:', error);
      setInputValue(content);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col rounded-2xl w-full border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] shadow-[0_16px_50px_rgba(0,0,0,0.25)]">
      {/* Upload Preview Area */}
      {currentUploads.length > 0 && (
        <div className="p-4 flex gap-4 overflow-x-auto border-b border-white/6">
          {currentUploads.map(upload => (
            <div key={upload.id} className="relative group w-48 h-48 rounded-2xl flex-shrink-0 flex flex-col overflow-hidden border border-white/8 bg-[#0f172a]">
              <button 
                type="button"
                onClick={() => removeUpload(contextId, upload.id)}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white rounded-full p-1 z-10 transition-colors"
              >
                <X size={16} />
              </button>
              
              <div className="flex-1 flex items-center justify-center bg-[#09111f] overflow-hidden">
                {upload.previewUrl ? (
                  upload.file.type.startsWith('video/') ? (
                    <video src={upload.previewUrl} className="w-full h-full object-cover opacity-80" />
                  ) : (
                    <img src={upload.previewUrl} alt="preview" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="flex flex-col items-center text-[#949BA4]">
                    <FileIcon size={40} className="mb-2" />
                    <span className="text-xs truncate max-w-[120px]">{upload.file.name}</span>
                  </div>
                )}
              </div>

              {/* Progress/Status Bar */}
              <div className="h-6 bg-white/4 flex items-center px-2">
                {upload.status === 'ERROR' ? (
                  <span className="text-xs text-red-400 truncate">{upload.error || 'Erro'}</span>
                ) : upload.status === 'UPLOADING' ? (
                  <div className="w-full">
                    <div className="h-1.5 w-full bg-[#1E1F22] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-[#949BA4] truncate">{upload.file.name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="flex items-center px-4 py-2.5">
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
        className="bg-cyan-200 text-slate-950 hover:bg-white rounded-full p-0.5 transition-colors flex-shrink-0 shadow-lg"
        >
          <PlusCircle size={20} className="fill-current text-transparent" />
        </button>
        <input
          type="file"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileSelect}
        />

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={isSending}
          className="bg-transparent border-none outline-none text-white flex-1 text-[15px] placeholder-slate-500 ml-4"
        />

        <div className="flex items-center space-x-3 ml-3 relative flex-shrink-0">
          <button 
            type="button" 
            onClick={() => {
              setShowGifPicker(!showGifPicker);
              setShowEmojiPicker(false);
            }}
            disabled={isSending}
            className="text-xs font-bold bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-100 px-2 py-1 rounded-full transition-colors"
          >
            GIF
          </button>

          <button 
            type="button" 
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowGifPicker(false);
            }}
            disabled={isSending}
            className="text-slate-300 hover:text-white transition-colors"
          >
            <Smile size={22} />
          </button>
          
          {showGifPicker && (
            <div className="absolute bottom-12 right-0 z-50 w-[350px]">
              <GifPicker
                onSelectGif={(gif) => {
                  onSendMessage(gif.url, []);
                  setShowGifPicker(false);
                }}
                onClose={() => setShowGifPicker(false)}
              />
            </div>
          )}

          {showEmojiPicker && (
            <div className="absolute bottom-12 right-0 z-50">
              <EmojiPicker
                theme={Theme.DARK}
                onEmojiClick={(emoji: EmojiClickData) => {
                  setInputValue(prev => prev + emoji.emoji);
                  setShowEmojiPicker(false);
                }}
              />
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={(!inputValue.trim() && currentUploads.length === 0) || isSending}
            className={`${(inputValue.trim() || currentUploads.length > 0) && !isSending ? 'text-cyan-300' : 'text-slate-500'} transition-colors`}
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
