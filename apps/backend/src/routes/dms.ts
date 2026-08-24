import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, ConversationParticipant, Prisma } from '@prisma/client';
import { Server } from 'socket.io';
import { z } from 'zod';

const messageSchema = z.object({
  content: z.string().max(2000).optional(),
  attachmentIds: z.array(z.string()).optional()
}).refine(data => data.content || (data.attachmentIds && data.attachmentIds.length > 0), {
  message: "Content or attachments are required"
});

const MAX_GROUP_DM_PARTICIPANTS = 10;

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

    const dms = participations.map((p) => {
      // For DIRECT DMs, recipient is the other user. For GROUP, we send all participants.
      const otherParticipants = p.conversation.participants.filter(cp => cp.userId !== user.id).map(cp => cp.user);
      
      return {
        id: p.conversation.id,
        type: p.conversation.type,
        name: p.conversation.name,
        iconUrl: p.conversation.iconUrl,
        ownerId: p.conversation.ownerId,
        recipient: p.conversation.type === 'DIRECT' ? otherParticipants[0] : null,
        participants: otherParticipants,
        lastMessage: p.conversation.messages[0],
        updatedAt: p.conversation.updatedAt,
      };
    }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return reply.send(dms);
  });

  // Get or create DM with user (DIRECT)
  fastify.post('/with/:targetUserId', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { targetUserId } = request.params as { targetUserId: string };

    if (user.id === targetUserId) {
      return reply.status(400).send({ error: 'Cannot create DM with yourself' });
    }

    try {
      const existingParticipations = await prisma.conversationParticipant.findMany({
        where: { userId: user.id },
        include: { conversation: { include: { participants: true } } }
      });

      const existingDM = existingParticipations.find((p) => 
        p.conversation.type === 'DIRECT' && 
        p.conversation.participants.some(cp => cp.userId === targetUserId)
      );

      if (existingDM) {
        return reply.send({ id: existingDM.conversationId });
      }

      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser) return reply.status(404).send({ error: 'User not found' });

      const newDM = await prisma.conversation.create({
        data: {
          type: 'DIRECT',
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

  // Create Group DM
  fastify.post('/group', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const schema = z.object({
      userIds: z.array(z.string()).min(1).max(MAX_GROUP_DM_PARTICIPANTS - 1),
      name: z.string().max(100).optional(),
      iconUrl: z.string().url().optional()
    });

    try {
      const { userIds, name, iconUrl } = schema.parse(request.body);

      // Unique userIds excluding creator
      const targetUserIds = Array.from(new Set(userIds.filter(id => id !== user.id)));

      if (targetUserIds.length === 0) {
        return reply.status(400).send({ error: 'Must provide at least one valid target user' });
      }

      // Check if all targets are friends and not blocked
      for (const targetId of targetUserIds) {
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { userAId: user.id, userBId: targetId },
              { userAId: targetId, userBId: user.id }
            ]
          }
        });

        if (!friendship) return reply.status(403).send({ error: `User ${targetId} is not a friend` });

        const block = await prisma.block.findFirst({
          where: {
            OR: [
              { blockerId: user.id, blockedId: targetId },
              { blockerId: targetId, blockedId: user.id }
            ]
          }
        });

        if (block) return reply.status(403).send({ error: `Cannot add user ${targetId}` });
      }

      // Create Group atomically
      const group = await prisma.$transaction(async (tx) => {
        const conv = await tx.conversation.create({
          data: {
            type: 'GROUP',
            name,
            iconUrl,
            ownerId: user.id,
            participants: {
              create: [
                { userId: user.id },
                ...targetUserIds.map(id => ({ userId: id }))
              ]
            }
          },
          include: {
            participants: { include: { user: true } }
          }
        });
        return conv;
      });

      // Emit realtime events
      const io = getIo();
      if (io) {
        group.participants.forEach(p => {
          io.to(`user_${p.userId}`).emit('dm:group:created', group);
        });
      }

      return reply.status(201).send(group);
    } catch (error) {
      if (error instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid input' });
      console.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Leave Group
  fastify.post('/:id/leave', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    try {
      const group = await prisma.conversation.findUnique({
        where: { id },
        include: { participants: { orderBy: { joinedAt: 'asc' } } }
      });

      if (!group || group.type !== 'GROUP') return reply.status(404).send({ error: 'Group not found' });

      const isParticipant = group.participants.some(p => p.userId === user.id);
      if (!isParticipant) return reply.status(403).send({ error: 'Not in group' });

      await prisma.$transaction(async (tx) => {
        // Remove participant
        await tx.conversationParticipant.delete({
          where: { userId_conversationId: { userId: user.id, conversationId: id } }
        });

        // Transfer ownership if owner leaves
        if (group.ownerId === user.id) {
          const remaining = group.participants.filter(p => p.userId !== user.id);
          if (remaining.length > 0) {
            await tx.conversation.update({
              where: { id },
              data: { ownerId: remaining[0].userId }
            });
          } else {
            // Delete group if empty
            await tx.conversation.delete({ where: { id } });
          }
        }
      });

      const io = getIo();
      if (io) {
        group.participants.forEach(p => {
          if (p.userId === user.id) {
            io.to(`user_${p.userId}`).emit('dm:group:left', { conversationId: id });
          } else {
            io.to(`user_${p.userId}`).emit('dm:group:participant_removed', { conversationId: id, userId: user.id });
          }
        });
      }

      return reply.send({ success: true });
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
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        attachments: true
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
      const { content, attachmentIds = [] } = messageSchema.parse(request.body);

      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: { participants: true }
      });

      if (!conversation) return reply.status(404).send({ error: 'Conversation not found' });

      if (!conversation.participants.some(p => p.userId === user.id)) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      if (conversation.type === 'DIRECT') {
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
      }

      // Validate attachments
      if (attachmentIds.length > 0) {
        const attachments = await prisma.attachment.findMany({
          where: { id: { in: attachmentIds } }
        });
        
        if (attachments.length !== attachmentIds.length) {
          return reply.status(400).send({ error: 'One or more attachments not found' });
        }
        
        for (const attachment of attachments) {
          if (attachment.uploaderId !== user.id) return reply.status(403).send({ error: 'You do not own this attachment' });
          if (attachment.status !== 'READY') return reply.status(400).send({ error: 'Attachment is not ready' });
          if (attachment.messageId || attachment.directMessageId) return reply.status(400).send({ error: 'Attachment already in use' });
        }
      }

      const message = await prisma.$transaction(async (tx) => {
        const msg = await tx.directMessage.create({
          data: {
            content: content || '',
            authorId: user.id,
            conversationId: id
          },
          include: {
            author: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
          }
        });

        if (attachmentIds.length > 0) {
          await tx.attachment.updateMany({
            where: { id: { in: attachmentIds } },
            data: { 
              status: 'ATTACHED',
              directMessageId: msg.id
            }
          });
        }

        return tx.directMessage.findUnique({
          where: { id: msg.id },
          include: {
            author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            attachments: true
          }
        });
      });

      await prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() }
      });

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

  // Add Participant
  fastify.post('/:id/participants', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const schema = z.object({ userId: z.string() });

    try {
      const { userId } = schema.parse(request.body);

      const group = await prisma.conversation.findUnique({
        where: { id },
        include: { participants: true }
      });

      if (!group || group.type !== 'GROUP') return reply.status(404).send({ error: 'Group not found' });
      if (group.ownerId !== user.id) return reply.status(403).send({ error: 'Only owner can add participants' });
      if (group.participants.length >= MAX_GROUP_DM_PARTICIPANTS) return reply.status(400).send({ error: 'Group is full' });
      if (group.participants.some(p => p.userId === userId)) return reply.status(400).send({ error: 'User already in group' });

      // Friend check
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userAId: user.id, userBId: userId },
            { userAId: userId, userBId: user.id }
          ]
        }
      });
      if (!friendship) return reply.status(403).send({ error: 'User is not a friend' });

      const block = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: user.id, blockedId: userId },
            { blockerId: userId, blockedId: user.id }
          ]
        }
      });
      if (block) return reply.status(403).send({ error: 'Cannot add this user' });

      const newParticipant = await prisma.conversationParticipant.create({
        data: {
          conversationId: id,
          userId
        },
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } } }
      });

      const updatedGroup = await prisma.conversation.findUnique({
        where: { id },
        include: { participants: { include: { user: true } } }
      });

      const io = getIo();
      if (io) {
        group.participants.forEach(p => {
          io.to(`user_${p.userId}`).emit('dm:group:participant_added', { conversationId: id, participant: newParticipant });
        });
        io.to(`user_${userId}`).emit('dm:group:created', updatedGroup); // Send full group to the new user
      }

      return reply.send(newParticipant);
    } catch (error) {
      if (error instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid input' });
      console.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Remove Participant (by owner)
  fastify.delete('/:id/participants/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id, userId } = request.params as { id: string, userId: string };

    try {
      const group = await prisma.conversation.findUnique({
        where: { id },
        include: { participants: true }
      });

      if (!group || group.type !== 'GROUP') return reply.status(404).send({ error: 'Group not found' });
      if (group.ownerId !== user.id) return reply.status(403).send({ error: 'Only owner can remove participants' });
      if (userId === user.id) return reply.status(400).send({ error: 'Use /leave to leave the group' });

      const exists = group.participants.some(p => p.userId === userId);
      if (!exists) return reply.status(404).send({ error: 'Participant not found' });

      await prisma.conversationParticipant.delete({
        where: { userId_conversationId: { userId, conversationId: id } }
      });

      const io = getIo();
      if (io) {
        group.participants.forEach(p => {
          if (p.userId === userId) {
            io.to(`user_${p.userId}`).emit('dm:group:left', { conversationId: id });
          } else {
            io.to(`user_${p.userId}`).emit('dm:group:participant_removed', { conversationId: id, userId });
          }
        });
      }

      return reply.send({ success: true });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
