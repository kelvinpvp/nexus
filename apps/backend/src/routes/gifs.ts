import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { getGifProvider } from '../services/gif';

export default async function gifsRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
  
  // POST /api/gifs/favorites
  fastify.post('/favorites', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const body = request.body as {
      provider: string;
      providerGifId: string;
      url: string;
      previewUrl?: string;
      width?: number;
      height?: number;
      title?: string;
    };

    if (!body || !body.provider || !body.providerGifId || !body.url) {
      return reply.status(400).send({ error: 'provider, providerGifId, and url are required' });
    }

    const providerType = body.provider.toUpperCase();
    if (providerType !== 'GIPHY' && providerType !== 'TENOR') {
       return reply.status(400).send({ error: 'Invalid provider. Must be GIPHY or TENOR' });
    }

    try {
      // Check if already exists
      const existing = await prisma.favoriteGif.findUnique({
        where: {
          userId_provider_providerGifId: {
            userId: user.id,
            provider: providerType as 'GIPHY' | 'TENOR',
            providerGifId: body.providerGifId
          }
        }
      });

      if (existing) {
        return reply.status(200).send(existing);
      }

      const fav = await prisma.favoriteGif.create({
        data: {
          userId: user.id,
          provider: providerType as 'GIPHY' | 'TENOR',
          providerGifId: body.providerGifId,
          url: body.url,
          previewUrl: body.previewUrl,
          width: body.width,
          height: body.height,
          title: body.title
        }
      });

      return reply.status(201).send(fav);
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ error: 'Failed to favorite GIF' });
    }
  });

  // GET /api/gifs/favorites
  fastify.get('/favorites', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    try {
      const favorites = await prisma.favoriteGif.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });
      return reply.send(favorites);
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ error: 'Failed to fetch favorite GIFs' });
    }
  });

  // DELETE /api/gifs/favorites/:id
  fastify.delete('/favorites/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params;
    
    try {
      const existing = await prisma.favoriteGif.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Favorite not found' });
      }

      if (existing.userId !== user.id) {
         return reply.status(403).send({ error: 'Not authorized' });
      }

      await prisma.favoriteGif.delete({ where: { id } });
      return reply.send({ success: true });
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ error: 'Failed to delete favorite GIF' });
    }
  });

  // Search abstraction
  fastify.get('/search', async (request: FastifyRequest<{ Querystring: { q: string, limit?: string, offset?: string } }>, reply: FastifyReply) => {
    const { q, limit, offset } = request.query;
    try {
      const provider = getGifProvider();
      const results = await provider.search(q, parseInt(limit || '20'), parseInt(offset || '0'));
      return reply.send({ data: results });
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ error: 'Search failed' });
    }
  });

  fastify.get('/trending', async (request: FastifyRequest<{ Querystring: { limit?: string, offset?: string } }>, reply: FastifyReply) => {
    const { limit, offset } = request.query;
    try {
      const provider = getGifProvider();
      const results = await provider.trending(parseInt(limit || '20'), parseInt(offset || '0'));
      return reply.send({ data: results });
    } catch (e) {
      request.log.error(e);
      return reply.status(500).send({ error: 'Trending failed' });
    }
  });

}
