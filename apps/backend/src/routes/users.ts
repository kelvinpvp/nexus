import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

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
});

const profileUpdateSchema = z.object({
  displayName: z.string().max(50).nullable().optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

import { LocalFileStorageProvider } from '../providers/LocalFileStorageProvider';

const storageProvider = new LocalFileStorageProvider();

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

  // Update profile
  fastify.patch('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    try {
      const data = profileUpdateSchema.parse(request.body);
      
      if (data.username && data.username !== user.username) {
        const existing = await prisma.user.findUnique({ where: { username: data.username }});
        if (existing) {
          return reply.status(400).send({ error: 'Esse nome de usuário já está sendo utilizado.' });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data
      });

      return reply.send({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        avatarUrl: updatedUser.avatarUrl,
        status: updatedUser.status,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Upload Avatar
  fastify.post('/me/avatar', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const data = await request.file();
    
    if (!data) {
      return reply.status(400).send({ error: 'Nenhum arquivo enviado.' });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Formato inválido. Apenas JPG, PNG, GIF e WEBP são aceitos.' });
    }

    const buffer = await data.toBuffer();
    
    if (buffer.length > 5 * 1024 * 1024) {
      return reply.status(400).send({ error: 'O tamanho do arquivo excede o limite de 5MB.' });
    }

    try {
      if (user.avatarUrl) {
        await storageProvider.deleteFile(user.avatarUrl);
      }

      const fileUrl = await storageProvider.saveFile(buffer, data.filename, data.mimetype);
      
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: fileUrl }
      });

      return reply.send({
        id: updatedUser.id,
        avatarUrl: updatedUser.avatarUrl
      });
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ error: 'Erro ao processar o upload do avatar.' });
    }
  });

  // Upload Banner
  fastify.post('/me/banner', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const data = await request.file();
    
    if (!data) {
      return reply.status(400).send({ error: 'Nenhum arquivo enviado.' });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'Formato inválido. Apenas JPG, PNG, GIF e WEBP são aceitos.' });
    }

    const buffer = await data.toBuffer();
    
    if (buffer.length > 10 * 1024 * 1024) {
      return reply.status(400).send({ error: 'O tamanho do arquivo excede o limite de 10MB.' });
    }

    try {
      if (user.bannerUrl) {
        await storageProvider.deleteFile(user.bannerUrl);
      }

      const fileUrl = await storageProvider.saveFile(buffer, data.filename, data.mimetype);
      
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { bannerUrl: fileUrl }
      });

      return reply.send({
        id: updatedUser.id,
        bannerUrl: updatedUser.bannerUrl
      });
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ error: 'Erro ao processar o upload do banner.' });
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
