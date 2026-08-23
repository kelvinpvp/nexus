import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

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

      // Create categories
      const textCat = await prisma.category.create({
        data: { name: 'CANAIS DE TEXTO', order: 0, serverId: server.id }
      });
      const voiceCat = await prisma.category.create({
        data: { name: 'CANAIS DE VOZ', order: 1, serverId: server.id }
      });

      // Create channels
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
}
