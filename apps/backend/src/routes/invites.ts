import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

export default async function inviteRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
  
  // Preview invite
  fastify.get('/:code', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.params as { code: string };

    try {
      const invite = await prisma.serverInvite.findUnique({
        where: { code },
        include: {
          server: {
            include: {
              _count: { select: { members: true } }
            }
          },
          creator: { select: { username: true, displayName: true, avatarUrl: true } }
        }
      });

      if (!invite) {
        return reply.status(404).send({ error: 'Invite not found' });
      }

      // Check expiration
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return reply.status(410).send({ error: 'Invite expired' });
      }

      // Check max uses
      if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
        return reply.status(410).send({ error: 'Invite limit reached' });
      }

      return reply.send({
        code: invite.code,
        server: {
          id: invite.server.id,
          name: invite.server.name,
          iconUrl: invite.server.iconUrl,
          memberCount: invite.server._count.members
        },
        creator: invite.creator
      });
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Join via invite
  fastify.post('/:code/join', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { code } = request.params as { code: string };

    try {
      // 1. Initial check (without locking) to fail fast on expired/not found
      const inviteCheck = await prisma.serverInvite.findUnique({
        where: { code }
      });

      if (!inviteCheck) return reply.status(404).send({ error: 'Invite not found' });
      if (inviteCheck.expiresAt && inviteCheck.expiresAt < new Date()) return reply.status(410).send({ error: 'Invite expired' });
      if (inviteCheck.maxUses > 0 && inviteCheck.uses >= inviteCheck.maxUses) return reply.status(410).send({ error: 'Invite limit reached' });

      // 2. Check if already member
      const existingMember = await prisma.serverMember.findUnique({
        where: { userId_serverId: { userId: user.id, serverId: inviteCheck.serverId } }
      });

      if (existingMember) {
        return reply.status(400).send({ error: 'You are already a member of this server', serverId: inviteCheck.serverId });
      }

      // Check ban (Not implemented yet, but keeping placeholder for future)
      /* 
      const ban = await prisma.serverBan.findUnique({
        where: { userId_serverId: { userId: user.id, serverId: inviteCheck.serverId } }
      });
      if (ban) return reply.status(403).send({ error: 'You are banned from this server' });
      */

      // 3. Transaction to atomically join and increment uses
      const serverId = await prisma.$transaction(async (tx) => {
        // Increment uses
        const updatedInvite = await tx.serverInvite.update({
          where: { code },
          data: { uses: { increment: 1 } }
        });

        // Re-check maxUses race condition
        if (updatedInvite.maxUses > 0 && updatedInvite.uses > updatedInvite.maxUses) {
          throw new Error('INVITE_FULL');
        }

        // Add member
        await tx.serverMember.create({
          data: {
            userId: user.id,
            serverId: updatedInvite.serverId,
            role: 'MEMBER'
          }
        });

        return updatedInvite.serverId;
      });

      return reply.send({ success: true, serverId });
    } catch (error: any) {
      if (error.message === 'INVITE_FULL') {
        return reply.status(410).send({ error: 'Invite limit reached' });
      }
      console.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

}
