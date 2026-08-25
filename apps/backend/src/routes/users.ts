import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import argon2 from 'argon2';

const preferenceUpdateSchema = z.object({
  joinMuted: z.boolean().optional(),
  joinDeafened: z.boolean().optional(),
  screenShareQuality: z.enum(['AUTO', 'P720_30', 'P1080_30', 'P1080_60', 'MAX']).optional(),
  cameraQuality: z.enum(['AUTO', 'P720', 'P1080']).optional(),
  theme: z.string().optional(),
  messageDisplay: z.string().optional(),
  reducedMotion: z.boolean().optional(),
  notificationSounds: z.boolean().optional(),
  desktopNotifications: z.boolean().optional(),
  friendRequestPolicy: z.enum(['EVERYONE', 'FRIENDS_OF_FRIENDS', 'SERVER_MEMBERS', 'NOBODY']).optional(),
  allowServerDMs: z.boolean().optional(),
  audioInputDeviceId: z.string().optional().nullable(),
  audioOutputDeviceId: z.string().optional().nullable(),
  noiseSuppressionEnabled: z.boolean().optional(),
});

const profileUpdateSchema = z.object({
  displayName: z.string().trim().max(50).nullable().optional(),
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).max(128).optional(),
  currentPassword: z.string().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  bio: z.string().trim().max(190).nullable().optional(),
  customStatus: z.string().trim().max(128).nullable().optional(),
});

import { getStorageProvider } from '../services/storage';
import { v4 as uuidv4 } from 'uuid';

export default async function userRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
  
  // Get preferences
  fastify.get('/me/preferences', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    let pref = await prisma.userPreference.findUnique({
      where: { userId: user.id }
    });

    if (!pref) {
      pref = await prisma.userPreference.create({
        data: { userId: user.id }
      });
    }

    return reply.send(pref);
  });

  // Update preferences
  fastify.patch('/me/preferences', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    try {
      const data = preferenceUpdateSchema.parse(request.body);
      
      const pref = await prisma.userPreference.upsert({
        where: { userId: user.id },
        update: data,
        create: {
          userId: user.id,
          ...data
        }
      });

      return reply.send(pref);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update profile and sensitive account fields.
  fastify.patch('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionUser = (request as any).user;

    try {
      const parsed = profileUpdateSchema.parse(request.body);
      const { currentPassword, password, ...profileFields } = parsed;
      const dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });

      if (!dbUser) {
        return reply.status(404).send({ error: 'Usuário não encontrado.' });
      }

      if (profileFields.username && profileFields.username !== dbUser.username) {
        const existing = await prisma.user.findUnique({ where: { username: profileFields.username } });
        if (existing) {
          return reply.status(400).send({ error: 'Esse nome de usuário já está sendo utilizado.' });
        }
      }

      if (profileFields.email) {
        profileFields.email = profileFields.email.toLowerCase();
        if (profileFields.email !== dbUser.email) {
          const existing = await prisma.user.findUnique({ where: { email: profileFields.email } });
          if (existing) {
            return reply.status(400).send({ error: 'Este e-mail já está sendo utilizado.' });
          }
        }
      }

      const changesSensitiveData = password !== undefined || (
        profileFields.email !== undefined && profileFields.email !== dbUser.email
      );
      if (changesSensitiveData) {
        if (!currentPassword || !(await argon2.verify(dbUser.password, currentPassword))) {
          return reply.status(401).send({ error: 'A senha atual está incorreta.' });
        }
      }

      const updateData: any = { ...profileFields };
      if (password) {
        updateData.password = await argon2.hash(password);
      }

      const updatedUser = await prisma.user.update({
        where: { id: sessionUser.id },
        data: updateData,
      });

      const publicUser = {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        avatarUrl: updatedUser.avatarUrl,
        bannerUrl: updatedUser.bannerUrl,
        bio: updatedUser.bio,
        customStatus: updatedUser.customStatus,
        status: updatedUser.status,
      };

      const io = (fastify as any).io;
      if (io) {
        io.emit('user:profile_updated', publicUser);
      }

      return reply.send(publicUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados de perfil inválidos.', details: error.errors });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erro interno ao atualizar o perfil.' });
    }
  });

  // Presigned URL for Avatar
  fastify.post('/me/avatar/presign', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const body = request.body as { mimeType: string; sizeBytes: number };
    
    if (!body || !body.mimeType || !body.sizeBytes) {
      return reply.status(400).send({ error: 'Missing mimeType or sizeBytes' });
    }

    if (body.sizeBytes > 5 * 1024 * 1024) {
      return reply.status(400).send({ error: 'O tamanho do arquivo excede o limite de 5MB.' });
    }

    try {
      const storage = getStorageProvider();
      const uuid = uuidv4();
      const ext = body.mimeType.split('/')[1] || 'webp';
      const storageKey = `profiles/${user.id}/avatars/${uuid}.${ext}`;
      
      const uploadUrl = await storage.createUploadUrl(storageKey, body.mimeType, body.sizeBytes);
      
      const backendUrl = process.env.API_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
      const fileUrl = `${backendUrl.replace(/\/$/, '')}/api/storage/${storageKey}`;

      return reply.send({ uploadUrl, fileUrl, storageKey });
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ error: 'Erro ao gerar URL de upload.' });
    }
  });

  // Confirm Avatar
  fastify.post('/me/avatar/confirm', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const body = request.body as { fileUrl: string, storageKey: string };
    
    if (!body || !body.fileUrl) {
      return reply.status(400).send({ error: 'Missing fileUrl' });
    }

    try {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      const oldAvatar = dbUser?.avatarUrl;

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: body.fileUrl }
      });

      // Cleanup old avatar safely
      if (oldAvatar && oldAvatar !== body.fileUrl) {
        try {
          const oldStorageKey = oldAvatar.split('/').slice(3).join('/');
          const storage = getStorageProvider();
          if ((storage as any).deleteFile) {
             await (storage as any).deleteFile(oldStorageKey);
          }
        } catch (e) {
          console.error('Failed to cleanup old avatar', e);
        }
      }

      const io = (fastify as any).io;
      if (io) {
         io.emit('user:profile_updated', {
           userId: user.id,
           avatarUrl: updatedUser.avatarUrl,
           bannerUrl: updatedUser.bannerUrl
         });
      }

      return reply.send({
        id: updatedUser.id,
        avatarUrl: updatedUser.avatarUrl
      });
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ error: 'Erro ao confirmar avatar.' });
    }
  });

  // Presigned URL for Banner
  fastify.post('/me/banner/presign', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const body = request.body as { mimeType: string; sizeBytes: number };
    
    if (!body || !body.mimeType || !body.sizeBytes) {
      return reply.status(400).send({ error: 'Missing mimeType or sizeBytes' });
    }

    if (body.sizeBytes > 10 * 1024 * 1024) {
      return reply.status(400).send({ error: 'O tamanho do arquivo excede o limite de 10MB.' });
    }

    try {
      const storage = getStorageProvider();
      const uuid = uuidv4();
      const ext = body.mimeType.split('/')[1] || 'webp';
      const storageKey = `profiles/${user.id}/banners/${uuid}.${ext}`;
      
      const uploadUrl = await storage.createUploadUrl(storageKey, body.mimeType, body.sizeBytes);
      
      const backendUrl = process.env.API_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
      const fileUrl = `${backendUrl.replace(/\/$/, '')}/api/storage/${storageKey}`;

      return reply.send({ uploadUrl, fileUrl, storageKey });
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ error: 'Erro ao gerar URL de upload.' });
    }
  });

  // Confirm Banner
  fastify.post('/me/banner/confirm', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const body = request.body as { fileUrl: string, storageKey: string };
    
    if (!body || !body.fileUrl) {
      return reply.status(400).send({ error: 'Missing fileUrl' });
    }

    try {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      const oldBanner = dbUser?.bannerUrl;

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { bannerUrl: body.fileUrl }
      });

      if (oldBanner && oldBanner !== body.fileUrl) {
        try {
          const oldStorageKey = oldBanner.split('/').slice(3).join('/');
          const storage = getStorageProvider();
          if ((storage as any).deleteFile) {
             await (storage as any).deleteFile(oldStorageKey);
          }
        } catch (e) {
          console.error('Failed to cleanup old banner', e);
        }
      }

      const io = (fastify as any).io;
      if (io) {
         io.emit('user:profile_updated', {
           userId: user.id,
           avatarUrl: updatedUser.avatarUrl,
           bannerUrl: updatedUser.bannerUrl
         });
      }

      return reply.send({
        id: updatedUser.id,
        bannerUrl: updatedUser.bannerUrl
      });
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ error: 'Erro ao confirmar banner.' });
    }
  });



  // Get user profile by ID
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.params.id },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bannerUrl: true,
          status: true,
          customStatus: true,
          bio: true,
          createdAt: true,
        }
      });

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado.' });
      }

      return reply.send(user);
    } catch (e) {
      return reply.status(500).send({ error: 'Erro ao buscar perfil.' });
    }
  });

}
