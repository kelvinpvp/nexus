import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { PermissionService, Permissions } from '../services/PermissionService';

export default async function channelRoutes(fastify: FastifyInstance, prisma: PrismaClient, getIo: () => Server) {
  
  // Get messages for a channel
  fastify.get('/:channelId/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { channelId } = request.params as { channelId: string };

    try {
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: {
          server: true,
          overrides: true
        }
      });

      if (!channel) return reply.status(404).send({ error: 'Channel not found' });

      const member = await prisma.serverMember.findUnique({
        where: { userId_serverId: { userId: user.id, serverId: channel.serverId } },
        include: { roles: { include: { role: true } } }
      });

      if (!member) return reply.status(403).send({ error: 'Access denied' });

      const allRoles = await prisma.role.findMany({ where: { serverId: channel.serverId } });
      const channelPerms = PermissionService.computeChannelPermissions(channel.server, member, allRoles, channel.overrides);

      if (!PermissionService.hasFlag(channelPerms, Permissions.VIEW_CHANNEL)) {
        return reply.status(403).send({ error: 'Você não tem permissão para ver este canal.' });
      }

      const messages = await prisma.message.findMany({
        where: { channelId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          author: {
            select: { id: true, username: true, avatarUrl: true }
          }
        }
      });

      return reply.send(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Send a message
  fastify.post('/:channelId/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { channelId } = request.params as { channelId: string };
    const { content } = request.body as { content: string };

    if (!content || content.trim().length === 0) {
      return reply.status(400).send({ error: 'Message content is required' });
    }

    try {
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: {
          server: true,
          overrides: true
        }
      });

      if (!channel) return reply.status(404).send({ error: 'Channel not found' });

      const member = await prisma.serverMember.findUnique({
        where: { userId_serverId: { userId: user.id, serverId: channel.serverId } },
        include: { roles: { include: { role: true } } }
      });

      if (!member) return reply.status(403).send({ error: 'Access denied' });

      const allRoles = await prisma.role.findMany({ where: { serverId: channel.serverId } });
      const channelPerms = PermissionService.computeChannelPermissions(channel.server, member, allRoles, channel.overrides);

      if (!PermissionService.hasFlag(channelPerms, Permissions.VIEW_CHANNEL) || !PermissionService.hasFlag(channelPerms, Permissions.SEND_MESSAGES)) {
        return reply.status(403).send({ error: 'Você não tem permissão para enviar mensagens neste canal.' });
      }

      const message = await prisma.message.create({
        data: {
          content: content.trim(),
          channelId,
          authorId: user.id
        },
        include: {
          author: {
            select: { id: true, username: true, avatarUrl: true }
          }
        }
      });

      // Broadcast to all clients in the channel room via Socket.IO
      const io = getIo();
      if (io) {
        io.to(channelId).emit('new_message', message);
      }

      return reply.status(201).send(message);
    } catch (error) {
      console.error('Error sending message:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
