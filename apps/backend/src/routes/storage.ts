import { FastifyPluginAsync } from 'fastify';
import { getStorageProvider } from '../services/storage';

export const storageRoutes: FastifyPluginAsync = async (fastify) => {
  const storage = getStorageProvider();

  // Redirect to presigned URL for private bucket objects
  fastify.get<{ Params: { key: string; '*': string } }>(
    '/:key/*',
    async (request, reply) => {
      const storageKey = `${request.params.key}/${request.params['*']}`;
      
      try {
        // Generate a URL valid for 1 hour
        const url = await storage.createDownloadUrl(storageKey, 3600);
        return reply.redirect(url);
      } catch (err) {
        console.error('Erro ao gerar URL de download:', err);
        return reply.status(500).send({ error: 'Failed to generate download URL' });
      }
    }
  );
};
