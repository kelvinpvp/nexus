import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, ServerMember } from '@prisma/client';
import { AccessToken } from 'livekit-server-sdk';

export default async function voiceRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
  fastify.post('/token', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { channelId } = request.body as { channelId: string };

    if (!channelId) {
      return reply.status(400).send({ error: 'channelId is required' });
    }

    try {
      // Verify channel exists and is VOICE or STAGE
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: {
          server: {
            include: {
              members: true
            }
          }
        }
      });

      if (!channel) {
        return reply.status(404).send({ error: 'Channel not found' });
      }

      if (channel.type !== 'VOICE' && channel.type !== 'STAGE') {
        return reply.status(400).send({ error: 'Channel is not a voice or stage channel' });
      }

      // Check if user is a member of the server
      const member = channel.server.members.find((m: ServerMember) => m.userId === user.id);
      if (!member) {
        return reply.status(403).send({ error: 'Access denied to this server' });
      }

      const roomName = `nexus_voice_${channel.id}`;
      const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
      const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
      const wsUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';

      const at = new AccessToken(apiKey, apiSecret, {
        identity: user.id,
        name: user.username,
        metadata: JSON.stringify({
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          status: user.status || 'online',
          role: member.role
        })
      });

      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const token = await at.toJwt();

      return reply.send({
        token,
        wsUrl,
        roomName,
      });
    } catch (error) {
      console.error('Error generating LiveKit token:', error);
      return reply.status(500).send({ error: 'Failed to generate voice token' });
    }
  });
}
