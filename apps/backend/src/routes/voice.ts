import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { PermissionService, Permissions } from '../services/PermissionService';

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
          server: true,
          overrides: true
        }
      });

      if (!channel) return reply.status(404).send({ error: 'Channel not found' });
      if (channel.type !== 'VOICE' && channel.type !== 'STAGE') {
        return reply.status(400).send({ error: 'Channel is not a voice or stage channel' });
      }

      const member = await prisma.serverMember.findUnique({
        where: { userId_serverId: { userId: user.id, serverId: channel.serverId } },
        include: { roles: { include: { role: true } } }
      });

      if (!member) return reply.status(403).send({ error: 'Access denied to this server' });

      // Check Ban
      const isBanned = await prisma.serverBan.findUnique({
        where: { serverId_userId: { serverId: channel.serverId, userId: user.id } }
      });
      if (isBanned) return reply.status(403).send({ error: 'Você está banido deste servidor.' });

      // Check Timeout
      if (member.timeoutUntil && member.timeoutUntil > new Date()) {
        return reply.status(403).send({ error: 'Você está em silêncio temporário (Timeout).' });
      }

      // Check Permissions
      const allRoles = await prisma.role.findMany({ where: { serverId: channel.serverId } });
      const channelPerms = PermissionService.computeChannelPermissions(channel.server, member, allRoles, channel.overrides);

      if (!PermissionService.hasFlag(channelPerms, Permissions.VIEW_CHANNEL) || !PermissionService.hasFlag(channelPerms, Permissions.CONNECT)) {
        return reply.status(403).send({ error: 'Você não tem permissão para se conectar a este canal de voz.' });
      }

      const canSpeak = PermissionService.hasFlag(channelPerms, Permissions.SPEAK) && !member.serverMuted;

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
          serverMuted: member.serverMuted,
          serverDeafened: member.serverDeafened,
        })
      });

      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: canSpeak,
        canSubscribe: !member.serverDeafened,
        canPublishData: true,
      });

      const token = await at.toJwt();

      return reply.send({
        token,
        wsUrl,
        roomName,
        canSpeak,
        serverMuted: member.serverMuted,
        serverDeafened: member.serverDeafened,
      });
    } catch (error) {
      console.error('Error generating LiveKit token:', error);
      return reply.status(500).send({ error: 'Failed to generate voice token' });
    }
  });

  // VOICE MODERATION: Server Mute Member
  fastify.post('/mute', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { targetUserId, serverId, mute } = request.body as { targetUserId: string; serverId: string; mute: boolean };

    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) return reply.status(404).send({ error: 'Server not found' });

    const actorMember = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: user.id, serverId } },
      include: { roles: { include: { role: true } } }
    });
    const targetMember = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: targetUserId, serverId } },
      include: { roles: { include: { role: true } } }
    });

    if (!actorMember || !targetMember) return reply.status(404).send({ error: 'Member not found' });

    const allRoles = await prisma.role.findMany({ where: { serverId } });
    const actorPerms = PermissionService.computeServerPermissions(server, actorMember, allRoles);

    if (!PermissionService.hasFlag(actorPerms, Permissions.MUTE_MEMBERS)) {
      return reply.status(403).send({ error: 'Missing MUTE_MEMBERS permission' });
    }

    if (!PermissionService.canManageMember(server, actorMember, targetMember)) {
      return reply.status(403).send({ error: 'Cannot mute higher or equal hierarchy member' });
    }

    await prisma.serverMember.update({
      where: { id: targetMember.id },
      data: { serverMuted: mute }
    });

    await prisma.auditLog.create({
      data: {
        serverId,
        actorId: user.id,
        action: mute ? 'MEMBER_SERVER_MUTE' : 'MEMBER_SERVER_UNMUTE',
        targetType: 'User',
        targetId: targetUserId
      }
    });

    return reply.send({ success: true, serverMuted: mute });
  });

  // VOICE MODERATION: Server Deafen Member
  fastify.post('/deafen', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { targetUserId, serverId, deafen } = request.body as { targetUserId: string; serverId: string; deafen: boolean };

    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) return reply.status(404).send({ error: 'Server not found' });

    const actorMember = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: user.id, serverId } },
      include: { roles: { include: { role: true } } }
    });
    const targetMember = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: targetUserId, serverId } },
      include: { roles: { include: { role: true } } }
    });

    if (!actorMember || !targetMember) return reply.status(404).send({ error: 'Member not found' });

    const allRoles = await prisma.role.findMany({ where: { serverId } });
    const actorPerms = PermissionService.computeServerPermissions(server, actorMember, allRoles);

    if (!PermissionService.hasFlag(actorPerms, Permissions.DEAFEN_MEMBERS)) {
      return reply.status(403).send({ error: 'Missing DEAFEN_MEMBERS permission' });
    }

    if (!PermissionService.canManageMember(server, actorMember, targetMember)) {
      return reply.status(403).send({ error: 'Cannot deafen higher or equal hierarchy member' });
    }

    await prisma.serverMember.update({
      where: { id: targetMember.id },
      data: { serverDeafened: deafen }
    });

    await prisma.auditLog.create({
      data: {
        serverId,
        actorId: user.id,
        action: deafen ? 'MEMBER_SERVER_DEAFEN' : 'MEMBER_SERVER_UNDEAFEN',
        targetType: 'User',
        targetId: targetUserId
      }
    });

    return reply.send({ success: true, serverDeafened: deafen });
  });

  // VOICE MODERATION: Move Member to Another Channel
  fastify.post('/move', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { targetUserId, serverId, destinationChannelId } = request.body as { targetUserId: string; serverId: string; destinationChannelId: string };

    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) return reply.status(404).send({ error: 'Server not found' });

    const destChannel = await prisma.channel.findFirst({
      where: { id: destinationChannelId, serverId, type: 'VOICE' }
    });
    if (!destChannel) return reply.status(400).send({ error: 'Destination is not a valid voice channel in this server' });

    const actorMember = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: user.id, serverId } },
      include: { roles: { include: { role: true } } }
    });
    const targetMember = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: targetUserId, serverId } },
      include: { roles: { include: { role: true } } }
    });

    if (!actorMember || !targetMember) return reply.status(404).send({ error: 'Member not found' });

    const allRoles = await prisma.role.findMany({ where: { serverId } });
    const actorPerms = PermissionService.computeServerPermissions(server, actorMember, allRoles);

    if (!PermissionService.hasFlag(actorPerms, Permissions.MOVE_MEMBERS)) {
      return reply.status(403).send({ error: 'Missing MOVE_MEMBERS permission' });
    }

    if (!PermissionService.canManageMember(server, actorMember, targetMember)) {
      return reply.status(403).send({ error: 'Cannot move higher or equal hierarchy member' });
    }

    await prisma.auditLog.create({
      data: {
        serverId,
        actorId: user.id,
        action: 'MEMBER_MOVE',
        targetType: 'User',
        targetId: targetUserId,
        metadata: { destinationChannelId, destinationChannelName: destChannel.name }
      }
    });

    return reply.send({ success: true, destinationChannelId });
  });

  // VOICE MODERATION: Disconnect Member from Call
  fastify.post('/disconnect', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { targetUserId, serverId } = request.body as { targetUserId: string; serverId: string };

    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) return reply.status(404).send({ error: 'Server not found' });

    const actorMember = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: user.id, serverId } },
      include: { roles: { include: { role: true } } }
    });
    const targetMember = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: targetUserId, serverId } },
      include: { roles: { include: { role: true } } }
    });

    if (!actorMember || !targetMember) return reply.status(404).send({ error: 'Member not found' });

    const allRoles = await prisma.role.findMany({ where: { serverId } });
    const actorPerms = PermissionService.computeServerPermissions(server, actorMember, allRoles);

    if (!PermissionService.hasFlag(actorPerms, Permissions.DISCONNECT_MEMBERS)) {
      return reply.status(403).send({ error: 'Missing DISCONNECT_MEMBERS permission' });
    }

    if (!PermissionService.canManageMember(server, actorMember, targetMember)) {
      return reply.status(403).send({ error: 'Cannot disconnect higher or equal hierarchy member' });
    }

    await prisma.auditLog.create({
      data: {
        serverId,
        actorId: user.id,
        action: 'MEMBER_DISCONNECT',
        targetType: 'User',
        targetId: targetUserId
      }
    });

    return reply.send({ success: true });
  });
}
