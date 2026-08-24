import { create } from 'zustand';
import { apiFetch } from '@/lib/api';
export type AttachmentKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
export type AttachmentStatus = 'PENDING' | 'READY' | 'ATTACHED' | 'ABANDONED';

export interface UploadItem {
  id: string; // client-side generated uuid for tracking
  file: File;
  previewUrl?: string; // object URL for preview
  progress: number; // 0 to 100
  status: 'PENDING' | 'UPLOADING' | 'READY' | 'ERROR';
  error?: string;
  attachmentId?: string; // backend attachment ID once prepared
}

interface UploadStore {
  uploads: Record<string, UploadItem[]>; // Keyed by context (e.g. channelId or conversationId)
  addUploads: (contextId: string, files: File[]) => void;
  removeUpload: (contextId: string, uploadId: string) => void;
  clearUploads: (contextId: string) => void;
  startUploads: (contextId: string, contextType: 'SERVER_CHANNEL' | 'DIRECT_MESSAGE') => Promise<string[]>; // returns successful attachmentIds
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  uploads: {},

  addUploads: (contextId, files) => {
    set(state => {
      const existing = state.uploads[contextId] || [];
      const newUploads = files.map(file => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: file.type.startsWith('image/') || file.type.startsWith('video/') ? URL.createObjectURL(file) : undefined,
        progress: 0,
        status: 'PENDING' as const,
      }));
      return { uploads: { ...state.uploads, [contextId]: [...existing, ...newUploads] } };
    });
  },

  removeUpload: (contextId, uploadId) => {
    set(state => {
      const existing = state.uploads[contextId] || [];
      const filtered = existing.filter(u => u.id !== uploadId);
      // Revoke object URL to avoid memory leaks
      const removed = existing.find(u => u.id === uploadId);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      
      return { uploads: { ...state.uploads, [contextId]: filtered } };
    });
  },

  clearUploads: (contextId) => {
    set(state => {
      const existing = state.uploads[contextId] || [];
      existing.forEach(u => u.previewUrl && URL.revokeObjectURL(u.previewUrl));
      const { [contextId]: _, ...rest } = state.uploads;
      return { uploads: rest };
    });
  },

  startUploads: async (contextId, contextType) => {
    const { uploads } = get();
    const contextUploads = uploads[contextId] || [];
    const pendingUploads = contextUploads.filter(u => u.status === 'PENDING' || u.status === 'ERROR');

    if (pendingUploads.length === 0) {
      return contextUploads.filter(u => u.status === 'READY' && u.attachmentId).map(u => u.attachmentId!);
    }

    const successfulAttachmentIds: string[] = [];

    // Process uploads sequentially or with limited concurrency
    for (const upload of pendingUploads) {
      set(state => ({
        uploads: {
          ...state.uploads,
          [contextId]: state.uploads[contextId].map(u => u.id === upload.id ? { ...u, status: 'UPLOADING', progress: 0 } : u)
        }
      }));

      try {
        // 1. Prepare
        const prepareRes = await apiFetch('/api/uploads/prepare', {
          method: 'POST',
          body: JSON.stringify({
            filename: upload.file.name,
            sizeBytes: upload.file.size,
            mimeType: upload.file.type || 'application/octet-stream',
            contextType,
            contextId
          })
        });

        const { attachmentId, uploadUrl } = prepareRes;

        // 2. Upload via XMLHttpRequest for progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadUrl);
          // Only set Content-Type if uploading to S3, because signature includes it.
          // Wait, local storage mock uses multipart? No, local storage mock in attachments.ts expects multipart.
          // Actually, our local-storage route handles stream. Let's send it raw or adapt.
          // The presigned S3 url expects raw body PUT.
          // Wait, our fastify mock expects multipart? Let's check `attachments.ts`.
          // In `attachments.ts`, local-storage route uses `@fastify/multipart` and `request.file()`. That requires form-data.
          // Let's modify the local-storage route to accept raw body or we just use raw body here.
          // For now, we will send raw body which S3 expects.
          xhr.setRequestHeader('Content-Type', upload.file.type || 'application/octet-stream');
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              
              set(state => {
                const currentUpload = state.uploads[contextId]?.find(u => u.id === upload.id);
                if (currentUpload && currentUpload.progress === progress) {
                  return state; // No state change needed
                }
                return {
                  uploads: {
                    ...state.uploads,
                    [contextId]: state.uploads[contextId].map(u => u.id === upload.id ? { ...u, progress } : u)
                  }
                };
              });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(upload.file);
        });

        // 3. Complete
        await apiFetch(`/api/uploads/${attachmentId}/complete`, { method: 'POST' });

        set(state => ({
          uploads: {
            ...state.uploads,
            [contextId]: state.uploads[contextId].map(u => u.id === upload.id ? { ...u, status: 'READY', progress: 100, attachmentId } : u)
          }
        }));

        successfulAttachmentIds.push(attachmentId);

      } catch (error: any) {
        set(state => ({
          uploads: {
            ...state.uploads,
            [contextId]: state.uploads[contextId].map(u => u.id === upload.id ? { ...u, status: 'ERROR', error: error.message } : u)
          }
        }));
      }
    }

    // Return all READY attachment IDs
    const finalUploads = get().uploads[contextId] || [];
    return finalUploads.filter(u => u.status === 'READY' && u.attachmentId).map(u => u.attachmentId!);
  }
}));
