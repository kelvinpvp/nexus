import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, ServerMember } from '@prisma/client';
import { Server } from 'socket.io';

export default async function channelRoutes(fastify: FastifyInstance, prisma: PrismaClient, getIo: () => Server) {
  
  // Get messages for a channel
  fastify.get('/:channelId/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { channelId } = request.params as { channelId: string };

    try {
      // Validate user has access to this channel (through server)
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: { server: { include: { members: true } } }
      });

      if (!channel || !channel.server.members.some((m: ServerMember) => m.userId === user.id)) {
        return reply.status(403).send({ error: 'Access denied' });
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
      // Validate access
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: { server: { include: { members: true } } }
      });

      if (!channel || !channel.server.members.some((m: ServerMember) => m.userId === user.id)) {
        return reply.status(403).send({ error: 'Access denied' });
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
