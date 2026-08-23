import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { z } from 'zod';
import { AccessToken } from 'livekit-server-sdk';

const callInitiateSchema = z.object({
  conversationId: z.string(),
  type: z.enum(['VOICE', 'VIDEO']).default('VOICE'),
});

export default async function callRoutes(fastify: FastifyInstance, prisma: PrismaClient, getIo: () => Server) {
  
  // Create a new call session
  fastify.post('/', async (request, reply) => {
    const user = (request as any).user;
    const { conversationId, type } = callInitiateSchema.parse(request.body);

    // Verify user is part of the conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: user.id,
          conversationId,
        }
      }
    });

    if (!participant) {
      return reply.status(403).send({ error: 'You are not a participant in this conversation.' });
    }

    // Always clear any RINGING calls for this conversation — they should be answered or rejected instantly.
    // Only keep ACTIVE calls that were accepted within the last 4 hours.
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    
    await prisma.callSession.updateMany({
      where: {
        conversationId,
        OR: [
          { status: 'RINGING' },
          { status: 'ACTIVE', createdAt: { lt: fourHoursAgo } },
        ]
      },
      data: { status: 'MISSED', endedAt: new Date() }
    });

    // Only block if there is a genuinely ACTIVE (accepted) call in the last 4 hours
    const existingActiveCall = await prisma.callSession.findFirst({
      where: {
        conversationId,
        status: 'ACTIVE',
        createdAt: { gte: fourHoursAgo }
      }
    });

    if (existingActiveCall) {
      return reply.status(400).send({ error: 'A call is already active in this conversation.', call: existingActiveCall });
    }

    const call = await prisma.callSession.create({
      data: {
        conversationId,
        initiatorId: user.id,
        type,
      },
      include: {
        initiator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true }
        }
      }
    });

    // Notify other participants via Socket.IO
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId }
    });

    const io = getIo();
    for (const p of participants) {
      if (p.userId !== user.id) {
        io.to(`user_${p.userId}`).emit('dm:call:incoming', call);
      }
    }

    return reply.status(201).send(call);
  });

  // Accept a call
  fastify.post('/:id/accept', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const call = await prisma.callSession.findUnique({
      where: { id },
      include: { conversation: { include: { participants: true } } }
    });

    if (!call) return reply.status(404).send({ error: 'Call not found.' });
    
    const isParticipant = call.conversation.participants.some(p => p.userId === user.id);
    if (!isParticipant) return reply.status(403).send({ error: 'Unauthorized.' });

    if (call.status !== 'RINGING' && call.status !== 'ACTIVE') {
      return reply.status(400).send({ error: 'Call cannot be accepted in its current state.' });
    }

    const updatedCall = await prisma.callSession.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        acceptedAt: call.acceptedAt || new Date(),
      }
    });

    const io = getIo();
    for (const p of call.conversation.participants) {
      io.to(`user_${p.userId}`).emit('dm:call:accepted', updatedCall);
    }

    return reply.send(updatedCall);
  });

  // Decline a call
  fastify.post('/:id/decline', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const call = await prisma.callSession.findUnique({
      where: { id },
      include: { conversation: { include: { participants: true } } }
    });

    if (!call) return reply.status(404).send({ error: 'Call not found.' });

    const isParticipant = call.conversation.participants.some(p => p.userId === user.id);
    if (!isParticipant) return reply.status(403).send({ error: 'Unauthorized.' });

    const updatedCall = await prisma.callSession.update({
      where: { id },
      data: {
        status: 'DECLINED',
        endedAt: new Date(),
      }
    });

    const io = getIo();
    for (const p of call.conversation.participants) {
      io.to(`user_${p.userId}`).emit('dm:call:declined', updatedCall);
    }

    return reply.send(updatedCall);
  });

  // End a call
  fastify.post('/:id/end', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const call = await prisma.callSession.findUnique({
      where: { id },
      include: { conversation: { include: { participants: true } } }
    });

    if (!call) return reply.status(404).send({ error: 'Call not found.' });

    const isParticipant = call.conversation.participants.some(p => p.userId === user.id);
    if (!isParticipant) return reply.status(403).send({ error: 'Unauthorized.' });

    const updatedCall = await prisma.callSession.update({
      where: { id },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      }
    });

    const io = getIo();
    for (const p of call.conversation.participants) {
      io.to(`user_${p.userId}`).emit('dm:call:ended', updatedCall);
    }

    return reply.send(updatedCall);
  });

  // Get token for LiveKit
  fastify.post('/:id/token', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const call = await prisma.callSession.findUnique({
      where: { id },
      include: { conversation: { include: { participants: true } } }
    });

    if (!call) return reply.status(404).send({ error: 'Call not found.' });

    const isParticipant = call.conversation.participants.some(p => p.userId === user.id);
    if (!isParticipant) return reply.status(403).send({ error: 'Unauthorized.' });

    if (call.status !== 'ACTIVE') {
      return reply.status(400).send({ error: 'Call is not active.' });
    }

    const roomName = `dm:${call.conversationId}:${call.id}`;
    const participantName = user.displayName || user.username;

    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return reply.status(500).send({ error: 'LiveKit credentials missing on server.' });
    }

    const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity: user.id,
      name: participantName,
    });
    
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
    
    return reply.send({ token: await at.toJwt(), roomName });
  });

}
