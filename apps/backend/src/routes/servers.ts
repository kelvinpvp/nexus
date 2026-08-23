import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, MemberRole } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';

function generateInviteCode(): string {
  return crypto.randomBytes(5).toString('hex'); // 10 hex characters
}

export default async function serverRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
  
  // 1. Create a server
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { name, iconUrl } = request.body as { name: string, iconUrl?: string };

    if (!name || name.trim().length === 0) {
      return reply.status(400).send({ error: 'Server name is required' });
    }

    try {
      const server = await prisma.server.create({
        data: {
          name: name.trim(),
          iconUrl,
          ownerId: user.id,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER'
            }
          }
        }
      });

      const textCat = await prisma.category.create({
        data: { name: 'CANAIS DE TEXTO', order: 0, serverId: server.id }
      });
      const voiceCat = await prisma.category.create({
        data: { name: 'CANAIS DE VOZ', order: 1, serverId: server.id }
      });

      await prisma.channel.create({
        data: { name: 'geral', type: 'TEXT', order: 0, serverId: server.id, categoryId: textCat.id }
      });
      await prisma.channel.create({
        data: { name: 'Geral', type: 'VOICE', order: 0, serverId: server.id, categoryId: voiceCat.id }
      });

      const serverWithDetails = await prisma.server.findUnique({
        where: { id: server.id },
        include: {
          categories: {
            include: { channels: true }
          },
          members: true
        }
      });

      return reply.status(201).send(serverWithDetails);
    } catch (error) {
      console.error('Error creating server:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // 2. List user's servers
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    try {
      const servers = await prisma.server.findMany({
        where: {
          members: {
            some: { userId: user.id }
          }
        }
      });
      return reply.send(servers);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // 3. Get single server with channels and members
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    try {
      const server = await prisma.server.findFirst({
        where: {
          id,
          members: { some: { userId: user.id } }
        },
        include: {
          categories: {
            include: { channels: true },
            orderBy: { order: 'asc' }
          },
          members: {
            include: { user: true }
          }
        }
      });

      if (!server) {
        return reply.status(404).send({ error: 'Server not found or access denied' });
      }

      return reply.send(server);
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // --- SERVER INVITES ---

  // Create an invite
  fastify.post('/:id/invites', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const schema = z.object({
      maxUses: z.number().min(0).max(10000).default(0), // 0 = unlimited
      expiresIn: z.number().min(0).default(0) // seconds. 0 = never
    });

    try {
      const { maxUses, expiresIn } = schema.parse(request.body);

      // Check if user has permission (OWNER or ADMIN)
      const member = await prisma.serverMember.findUnique({
        where: { userId_serverId: { userId: user.id, serverId: id } }
      });

      if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
        return reply.status(403).send({ error: 'Missing permissions to create invite' });
      }

      let expiresAt: Date | null = null;
      if (expiresIn > 0) {
        expiresAt = new Date(Date.now() + expiresIn * 1000);
      }

      const invite = await prisma.serverInvite.create({
        data: {
          code: generateInviteCode(),
          serverId: id,
          creatorId: user.id,
          maxUses,
          expiresAt
        }
      });

      return reply.status(201).send(invite);
    } catch (error) {
      if (error instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid input' });
      console.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // List invites for a server
  fastify.get('/:id/invites', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    try {
      // Check if user has permission
      const member = await prisma.serverMember.findUnique({
        where: { userId_serverId: { userId: user.id, serverId: id } }
      });

      if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
        return reply.status(403).send({ error: 'Missing permissions to view invites' });
      }

      const invites = await prisma.serverInvite.findMany({
        where: { serverId: id },
        include: {
          creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      return reply.send(invites);
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Revoke an invite
  fastify.delete('/:id/invites/:inviteId', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id, inviteId } = request.params as { id: string, inviteId: string };

    try {
      const member = await prisma.serverMember.findUnique({
        where: { userId_serverId: { userId: user.id, serverId: id } }
      });

      if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
        return reply.status(403).send({ error: 'Missing permissions to revoke invite' });
      }

      const invite = await prisma.serverInvite.findFirst({
        where: { id: inviteId, serverId: id }
      });

      if (!invite) return reply.status(404).send({ error: 'Invite not found' });

      await prisma.serverInvite.delete({
        where: { id: inviteId }
      });

      return reply.send({ success: true });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

}
