import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { Server } from 'socket.io';

const requestSchema = z.object({
  username: z.string(),
});

type FriendshipWithUsers = Prisma.FriendshipGetPayload<{
  include: {
    userA: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
    userB: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } }
  }
}>;

export default function friendRoutes(fastify: FastifyInstance, prisma: PrismaClient, getIo: () => Server) {

  // Get all friends
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userAId: user.id },
          { userBId: user.id }
        ]
      },
      include: {
        userA: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
        userB: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } }
      }
    });

    const friends = friendships.map((f: FriendshipWithUsers) => {
      const friend = f.userAId === user.id ? f.userB : f.userA;
      return { ...friend, friendshipId: f.id, friendshipCreatedAt: f.createdAt };
    });

    return reply.send(friends);
  });

  // Get pending friend requests (sent and received)
  fastify.get('/requests', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    const received = await prisma.friendRequest.findMany({
      where: { receiverId: user.id, status: 'PENDING' },
      include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }
    });

    const sent = await prisma.friendRequest.findMany({
      where: { senderId: user.id, status: 'PENDING' },
      include: { receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }
    });

    return reply.send({ received, sent });
  });

  // Send a friend request by username
  fastify.post('/requests', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    try {
      const { username } = requestSchema.parse(request.body);

      const receiver = await prisma.user.findUnique({ where: { username } });
      if (!receiver) {
        return reply.status(404).send({ error: 'Não encontramos esse usuário.' });
      }

      if (receiver.id === user.id) {
        return reply.status(400).send({ error: 'Você não pode adicionar a si mesmo.' });
      }

      // Check for block
      const hasBlock = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: user.id, blockedId: receiver.id },
            { blockerId: receiver.id, blockedId: user.id }
          ]
        }
      });

      if (hasBlock) {
        return reply.status(403).send({ error: 'Você não pode enviar pedido para este usuário.' });
      }

      // Check if already friends
      const existingFriendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userAId: user.id, userBId: receiver.id },
            { userAId: receiver.id, userBId: user.id }
          ]
        }
      });

      if (existingFriendship) {
        return reply.status(400).send({ error: 'Vocês já são amigos.' });
      }

      // Check existing pending request
      const existingRequest = await prisma.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: user.id, receiverId: receiver.id },
            { senderId: receiver.id, receiverId: user.id }
          ],
          status: 'PENDING'
        }
      });

      if (existingRequest) {
        if (existingRequest.senderId === user.id) {
          return reply.status(400).send({ error: 'Já existe um pedido de amizade pendente enviado por você.' });
        } else {
          // If they sent us a request, let's just accept it automatically? 
          // Or just block creation and tell them to accept it.
          return reply.status(400).send({ error: 'Este usuário já enviou um pedido para você. Verifique seus pedidos recebidos.' });
        }
      }

      const friendRequest = await prisma.friendRequest.create({
        data: {
          senderId: user.id,
          receiverId: receiver.id,
          status: 'PENDING'
        },
        include: {
          sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
        }
      });

      // Emit Socket event to receiver
      const io = getIo();
      if (io) {
        io.to(`user_${receiver.id}`).emit('friend:request_received', friendRequest);
      }

      return reply.status(201).send(friendRequest);

    } catch (error) {
      console.error(error);
      if (error instanceof z.ZodError) return reply.status(400).send({ error: 'Username inválido' });
      return reply.status(500).send({ error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Accept a friend request
  fastify.post('/requests/:id/accept', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    try {
      const friendRequest = await prisma.friendRequest.findUnique({ where: { id } });
      if (!friendRequest || friendRequest.receiverId !== user.id) {
        return reply.status(404).send({ error: 'Pedido não encontrado ou sem permissão.' });
      }

      if (friendRequest.status !== 'PENDING') {
        return reply.status(400).send({ error: 'Este pedido não está mais pendente.' });
      }

      let friendship = null;

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Create friendship
        friendship = await tx.friendship.create({
          data: {
            userAId: friendRequest.senderId,
            userBId: friendRequest.receiverId
          },
          include: {
            userA: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
            userB: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } }
          }
        });
        
        // Delete the request
        await tx.friendRequest.delete({ where: { id } });
      });

      // Emit to sender
      const io = getIo();
      if (io) {
        io.to(`user_${friendRequest.senderId}`).emit('friend:request_accepted', {
          friendshipId: (friendship as any)!.id,
          friend: (friendship as any)!.userB // To sender, friend is userB (receiver)
        });
        // Emit to receiver (self)
        io.to(`user_${friendRequest.receiverId}`).emit('friend:request_accepted', {
          friendshipId: (friendship as any)!.id,
          friend: (friendship as any)!.userA // To receiver, friend is userA (sender)
        });
      }

      return reply.send({ success: true });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Reject a friend request
  fastify.post('/requests/:id/reject', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    try {
      const friendRequest = await prisma.friendRequest.findUnique({ where: { id } });
      if (!friendRequest || friendRequest.receiverId !== user.id) {
        return reply.status(404).send({ error: 'Pedido não encontrado ou sem permissão.' });
      }

      await prisma.friendRequest.delete({ where: { id } });

      const io = getIo();
      if (io) {
        io.to(`user_${friendRequest.senderId}`).emit('friend:request_rejected', { requestId: id });
      }

      return reply.send({ success: true });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Cancel a sent friend request
  fastify.delete('/requests/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    try {
      const friendRequest = await prisma.friendRequest.findUnique({ where: { id } });
      if (!friendRequest || friendRequest.senderId !== user.id) {
        return reply.status(404).send({ error: 'Pedido não encontrado ou sem permissão.' });
      }

      await prisma.friendRequest.delete({ where: { id } });

      const io = getIo();
      if (io) {
        io.to(`user_${friendRequest.receiverId}`).emit('friend:request_cancelled', { requestId: id });
      }

      return reply.send({ success: true });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Remove a friend
  fastify.delete('/:friendId', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { friendId } = request.params as { friendId: string };

    try {
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userAId: user.id, userBId: friendId },
            { userAId: friendId, userBId: user.id }
          ]
        }
      });

      if (!friendship) {
        return reply.status(404).send({ error: 'Amizade não encontrada.' });
      }

      await prisma.friendship.delete({ where: { id: friendship.id } });

      const io = getIo();
      if (io) {
        io.to(`user_${friendId}`).emit('friend:removed', { friendId: user.id });
        io.to(`user_${user.id}`).emit('friend:removed', { friendId });
      }

      return reply.send({ success: true });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) });
    }
  });
}
