import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { getStorageProvider } from '../services/storage';
import crypto from 'crypto';
import path from 'path';

const MAX_UPLOAD_SIZE_BYTES = Number(process.env.MAX_UPLOAD_SIZE_BYTES) || 500 * 1024 * 1024; // Default 500MB

interface PrepareUploadBody {
  filename: string;
  sizeBytes: number;
  mimeType: string;
  contextType: 'SERVER_CHANNEL' | 'DIRECT_MESSAGE';
  contextId: string;
}

export default async function attachmentsRoutes(fastify: FastifyInstance) {
  const storage = getStorageProvider();

  fastify.post<{ Body: PrepareUploadBody }>('/api/uploads/prepare', async (request, reply) => {
    const user = request.user;
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const { filename, sizeBytes, mimeType, contextType, contextId } = request.body;

    if (sizeBytes > MAX_UPLOAD_SIZE_BYTES) {
      return reply.status(400).send({ error: 'File size exceeds maximum allowed limit' });
    }

    if (!['SERVER_CHANNEL', 'DIRECT_MESSAGE'].includes(contextType)) {
      return reply.status(400).send({ error: 'Invalid context type' });
    }

    // Authorization validation based on context
    if (contextType === 'SERVER_CHANNEL') {
      const channel = await prisma.channel.findUnique({
        where: { id: contextId },
        include: { server: true }
      });
      if (!channel) return reply.status(404).send({ error: 'Channel not found' });

      const member = await prisma.serverMember.findUnique({
        where: {
          userId_serverId: {
            userId: user.id,
            serverId: channel.serverId
          }
        }
      });
      if (!member) return reply.status(403).send({ error: 'Not a member of this server' });
      // TODO: Proper bitfield permission check for ATTACH_FILES here
    } else if (contextType === 'DIRECT_MESSAGE') {
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: contextId,
            userId: user.id
          }
        }
      });
      if (!participant) return reply.status(403).send({ error: 'Not a participant in this conversation' });
    }

    // Clean original filename
    const originalFilename = path.basename(filename).replace(/[^a-zA-Z0-9.\-_]/g, '_').substring(0, 255);
    
    // Generate secure opacque storage key
    const uuid = crypto.randomUUID();
    const storageKey = `attachments/${user.id}/${uuid}`;

    // Determine kind based on mimeType
    let kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' = 'FILE';
    if (mimeType.startsWith('image/')) kind = 'IMAGE';
    else if (mimeType.startsWith('video/')) kind = 'VIDEO';
    else if (mimeType.startsWith('audio/')) kind = 'AUDIO';

    // Create the PENDING attachment record
    const attachment = await prisma.attachment.create({
      data: {
        uploaderId: user.id,
        storageKey,
        storageProvider: process.env.STORAGE_PROVIDER || 'local',
        originalFilename,
        mimeType,
        sizeBytes,
        kind,
        status: 'PENDING'
      }
    });

    // Generate pre-signed PUT URL
    const uploadUrl = await storage.createUploadUrl(storageKey, mimeType, sizeBytes);

    return {
      attachmentId: attachment.id,
      uploadUrl,
      storageKey
    };
  });

  fastify.post<{ Params: { id: string } }>('/api/uploads/:id/complete', async (request, reply) => {
    const user = request.user;
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const { id } = request.params;

    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) return reply.status(404).send({ error: 'Attachment not found' });

    if (attachment.uploaderId !== user.id) {
      return reply.status(403).send({ error: 'Not authorized to complete this upload' });
    }

    if (attachment.status !== 'PENDING') {
      return reply.status(400).send({ error: 'Attachment is not pending' });
    }

    // Verify object exists and size matches in storage
    const isValid = await storage.verifyUpload(attachment.storageKey, attachment.sizeBytes);
    
    if (!isValid) {
      // In a real app we might mark it as ABANDONED immediately or wait for cleanup
      return reply.status(400).send({ error: 'Upload verification failed (file missing or size mismatch)' });
    }

    const updatedAttachment = await prisma.attachment.update({
      where: { id },
      data: { status: 'READY' }
    });

    return updatedAttachment;
  });

  fastify.get<{ Params: { id: string } }>('/api/attachments/:id/access', async (request, reply) => {
    const user = request.user;
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const { id } = request.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        message: { include: { channel: true } },
        directMessage: true
      }
    });

    if (!attachment) return reply.status(404).send({ error: 'Attachment not found' });
    
    // Validate if user has access to the message this is attached to
    if (attachment.status === 'ATTACHED') {
      if (attachment.message) {
        // Validate Server Channel Access
        const member = await prisma.serverMember.findUnique({
          where: {
            userId_serverId: {
              userId: user.id,
              serverId: attachment.message.channel.serverId
            }
          }
        });
        if (!member) return reply.status(403).send({ error: 'No access to server' });
        // TODO: Strict VIEW_CHANNEL permission check here!
      } else if (attachment.directMessage) {
        // Validate DM Access
        const participant = await prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId: attachment.directMessage.conversationId,
              userId: user.id
            }
          }
        });
        if (!participant) return reply.status(403).send({ error: 'No access to conversation' });
      }
    } else {
      // If PENDING/READY, only the uploader can access the file temporarily for preview
      if (attachment.uploaderId !== user.id) {
        return reply.status(403).send({ error: 'No access to pending attachment' });
      }
    }

    const ttl = Number(process.env.SIGNED_DOWNLOAD_URL_TTL_SECONDS) || 300; // 5 minutes default
    const downloadUrl = await storage.createDownloadUrl(attachment.storageKey, ttl);

    return { downloadUrl, expiresInSeconds: ttl };
  });

  // Local storage mock endpoint for dev (ONLY enabled if STORAGE_PROVIDER=local)
  if (process.env.STORAGE_PROVIDER === 'local') {
    // Add raw body parser for local storage mock
    fastify.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (req, body, done) => {
      done(null, body);
    });
    // Add fallback for any content type
    fastify.addContentTypeParser('*', { parseAs: 'buffer' }, (req, body, done) => {
      done(null, body);
    });

    fastify.put<{ Querystring: { key: string } }>('/api/local-storage/upload', async (request, reply) => {
      const data = request.body as Buffer;
      if (!data) return reply.status(400).send({ error: 'No body provided' });
      
      const key = request.query.key;
      if (!key) return reply.status(400).send({ error: 'Missing key param' });

      const fs = require('fs');
      
      const targetPath = path.join(process.cwd(), 'uploads', key);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });

      fs.writeFileSync(targetPath, data);

      return { success: true };
    });

    fastify.get<{ Querystring: { key: string } }>('/api/local-storage/download', async (request, reply) => {
      const key = request.query.key;
      if (!key) return reply.status(400).send({ error: 'Missing key param' });

      const fs = require('fs');
      const targetPath = path.join(process.cwd(), 'uploads', key);
      
      if (!fs.existsSync(targetPath)) return reply.status(404).send({ error: 'File not found' });
      
      const stream = fs.createReadStream(targetPath);
      return reply.send(stream);
    });
  }
}
