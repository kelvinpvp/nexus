import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { z } from 'zod';

const messageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export default function dmRoutes(fastify: FastifyInstance, prisma: PrismaClient, getIo: () => Server) {

  // Get all DMs for user
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    const participations = await prisma.conversationParticipant.findMany({
      where: { userId: user.id },
      include: {
        conversation: {
          include: {
            participants: {
              where: { userId: { not: user.id } },
              include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } } }
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    const dms = participations.map(p => ({
      id: p.conversation.id,
      type: p.conversation.type,
      recipient: p.conversation.participants[0]?.user,
      lastMessage: p.conversation.messages[0],
      updatedAt: p.conversation.updatedAt,
    })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return reply.send(dms);
  });

  // Get or create DM with user
  fastify.post('/with/:targetUserId', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { targetUserId } = request.params as { targetUserId: string };

    if (user.id === targetUserId) {
      return reply.status(400).send({ error: 'Cannot create DM with yourself' });
    }

    try {
      // Find existing DM (Conversation with exactly these two users and type DM)
      const existingParticipations = await prisma.conversationParticipant.findMany({
        where: { userId: user.id },
        include: { conversation: { include: { participants: true } } }
      });

      const existingDM = existingParticipations.find(p => 
        p.conversation.type === 'DM' && 
        p.conversation.participants.some(cp => cp.userId === targetUserId)
      );

      if (existingDM) {
        return reply.send({ id: existingDM.conversationId });
      }

      // Ensure target user exists
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser) return reply.status(404).send({ error: 'User not found' });

      // Create new DM
      const newDM = await prisma.conversation.create({
        data: {
          type: 'DM',
          participants: {
            create: [
              { userId: user.id },
              { userId: targetUserId }
            ]
          }
        }
      });

      return reply.status(201).send({ id: newDM.id });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get messages in a DM
  fastify.get('/:id/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const participant = await prisma.conversationParticipant.findUnique({
      where: { userId_conversationId: { userId: user.id, conversationId: id } }
    });

    if (!participant) return reply.status(403).send({ error: 'Access denied' });

    const messages = await prisma.directMessage.findMany({
      where: { conversationId: id },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    return reply.send(messages);
  });

  // Send a message in a DM
  fastify.post('/:id/messages', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    try {
      const { content } = messageSchema.parse(request.body);

      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: { participants: true }
      });

      if (!conversation) return reply.status(404).send({ error: 'Conversation not found' });

      if (!conversation.participants.some(p => p.userId === user.id)) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Check blocks (if A blocked B, or B blocked A, don't allow sending)
      const otherParticipant = conversation.participants.find(p => p.userId !== user.id);
      if (otherParticipant) {
        const block = await prisma.block.findFirst({
          where: {
            OR: [
              { blockerId: user.id, blockedId: otherParticipant.userId },
              { blockerId: otherParticipant.userId, blockedId: user.id }
            ]
          }
        });
        if (block) return reply.status(403).send({ error: 'Cannot send message to this user' });
      }

      const message = await prisma.directMessage.create({
        data: {
          content,
          authorId: user.id,
          conversationId: id
        },
        include: {
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
        }
      });

      await prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() }
      });

      // Emit to all participants
      const io = getIo();
      if (io) {
        conversation.participants.forEach(p => {
          io.to(`user_${p.userId}`).emit('dm:message', message);
        });
      }

      return reply.status(201).send(message);
    } catch (error) {
      if (error instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid input' });
      console.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
