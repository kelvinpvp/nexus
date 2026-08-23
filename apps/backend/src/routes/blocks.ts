import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';

export default function blockRoutes(fastify: FastifyInstance, prisma: PrismaClient, getIo: () => Server) {

  // Get all blocks
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    const blocks = await prisma.block.findMany({
      where: { blockerId: user.id },
      include: {
        blocked: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
      }
    });

    return reply.send(blocks);
  });

  // Block a user
  fastify.post('/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { userId: blockedId } = request.params as { userId: string };

    if (user.id === blockedId) {
      return reply.status(400).send({ error: 'Você não pode bloquear a si mesmo.' });
    }

    try {
      // Check if already blocked
      const existingBlock = await prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: user.id,
            blockedId
          }
        }
      });

      if (existingBlock) {
        return reply.status(400).send({ error: 'Usuário já está bloqueado.' });
      }

      await prisma.$transaction(async (tx) => {
        // Create block
        await tx.block.create({
          data: {
            blockerId: user.id,
            blockedId
          }
        });

        // Delete any friendship
        const friendship = await tx.friendship.findFirst({
          where: {
            OR: [
              { userAId: user.id, userBId: blockedId },
              { userAId: blockedId, userBId: user.id }
            ]
          }
        });

        if (friendship) {
          await tx.friendship.delete({ where: { id: friendship.id } });
        }

        // Delete any pending requests
        await tx.friendRequest.deleteMany({
          where: {
            OR: [
              { senderId: user.id, receiverId: blockedId },
              { senderId: blockedId, receiverId: user.id }
            ]
          }
        });
      });

      const io = getIo();
      if (io) {
        io.to(`user_${blockedId}`).emit('friend:removed', { friendId: user.id });
        io.to(`user_${user.id}`).emit('block:created', { blockedId });
      }

      return reply.status(201).send({ success: true });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Unblock a user
  fastify.delete('/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { userId: blockedId } = request.params as { userId: string };

    try {
      const block = await prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: user.id,
            blockedId
          }
        }
      });

      if (!block) {
        return reply.status(404).send({ error: 'Bloqueio não encontrado.' });
      }

      await prisma.block.delete({
        where: { id: block.id }
      });

      const io = getIo();
      if (io) {
        io.to(`user_${user.id}`).emit('block:removed', { blockedId });
      }

      return reply.send({ success: true });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
