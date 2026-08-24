import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { FileIcon, Download, Loader2 } from 'lucide-react';

interface Attachment {
  id: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
}

interface AttachmentViewerProps {
  attachment: Attachment;
}

export default function AttachmentViewer({ attachment }: AttachmentViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    let mounted = true;
    const fetchUrl = async () => {
      try {
        const res = await apiFetch(`/api/attachments/${attachment.id}/access`);
        if (mounted && res.downloadUrl) {
          setUrl(res.downloadUrl);
        }
      } catch (e) {
        console.error('Failed to load attachment URL', e);
        if (mounted) setError(true);
      }
    };
    fetchUrl();
    
    return () => { mounted = false; };
  }, [attachment.id]);

  if (error) {
    return (
      <div className="flex items-center space-x-2 bg-[#2B2D31] border border-red-500/30 p-3 rounded-lg max-w-sm mt-1">
        <FileIcon className="text-red-400" size={24} />
        <span className="text-red-400 text-sm">Failed to load attachment</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center space-x-2 bg-[#2B2D31] border border-[#1E1F22] p-3 rounded-lg max-w-sm mt-1 animate-pulse">
        <Loader2 className="animate-spin text-[#949BA4]" size={24} />
        <span className="text-[#949BA4] text-sm">Loading {attachment.originalFilename}...</span>
      </div>
    );
  }

  if (attachment.kind === 'IMAGE') {
    return (
      <div className="mt-1 max-w-md rounded-lg overflow-hidden border border-[#1E1F22]">
        <img 
          src={url} 
          alt={attachment.originalFilename} 
          className="w-full max-h-96 object-contain bg-black/20 cursor-pointer" 
          onClick={() => window.open(url, '_blank')}
        />
      </div>
    );
  }

  if (attachment.kind === 'VIDEO') {
    return (
      <div className="mt-1 max-w-md rounded-lg overflow-hidden border border-[#1E1F22]">
        <video 
          src={url} 
          controls 
          className="w-full max-h-96 object-contain bg-black/20" 
        />
      </div>
    );
  }

  if (attachment.kind === 'AUDIO') {
    return (
      <div className="mt-1 max-w-md rounded-lg overflow-hidden border border-[#1E1F22] p-2 bg-[#2B2D31]">
        <audio src={url} controls className="w-full" />
      </div>
    );
  }

  // Generic File
  return (
    <div className="mt-1 p-3 bg-[#2B2D31] border border-[#1E1F22] rounded-lg max-w-sm flex items-center justify-between group hover:bg-[#313338] transition-colors">
      <div className="flex items-center space-x-3 overflow-hidden">
        <div className="w-10 h-10 rounded bg-[#1E1F22] flex items-center justify-center flex-shrink-0 text-[#949BA4]">
          <FileIcon size={24} />
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-white truncate group-hover:underline cursor-pointer" onClick={() => window.open(url, '_blank')}>
            {attachment.originalFilename}
          </p>
          <p className="text-xs text-[#949BA4]">
            {(attachment.sizeBytes / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>
      <a 
        href={url} 
        download={attachment.originalFilename}
        target="_blank"
        rel="noreferrer"
        className="text-[#949BA4] hover:text-[#DBDEE1] p-2 flex-shrink-0"
      >
        <Download size={20} />
      </a>
    </div>
  );
}
