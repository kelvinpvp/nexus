import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { z } from 'zod';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

const callInitiateSchema = z.object({
  conversationId: z.string(),
  type: z.enum(['VOICE', 'VIDEO']).default('VOICE'),
});

// In-memory or Redis-backed grace period timers map
const emptyRoomGraceTimers: Record<string, NodeJS.Timeout> = {};

export default async function callRoutes(fastify: FastifyInstance, prisma: PrismaClient, getIo: () => Server) {
  
  // Helper to query LiveKit for active room participant count
  const getLiveKitRoomParticipants = async (roomName: string): Promise<number> => {
    if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return 0;
    }
    try {
      const httpUrl = process.env.LIVEKIT_URL.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
      const svc = new RoomServiceClient(httpUrl, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
      const participants = await svc.listParticipants(roomName);
      return participants.length;
    } catch (err) {
      // Room might not exist yet or be empty
      return 0;
    }
  };

  // GET /api/calls/active/:conversationId - Query active call for conversation safely
  fastify.get('/active/:conversationId', async (request, reply) => {
    const user = (request as any).user;
    const { conversationId } = request.params as { conversationId: string };

    // Verify authenticated user belongs to conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: user.id,
          conversationId,
        }
      }
    });

    if (!participant) {
      return reply.status(403).send({ error: 'Você não pertence a este grupo.' });
    }

    const activeCall = await prisma.callSession.findFirst({
      where: {
        conversationId,
        status: { in: ['ACTIVE', 'RINGING'] }
      },
      include: {
        initiator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true }
        },
        conversation: {
          select: { id: true, type: true, ownerId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeCall) {
      return reply.send({ activeCall: null, participantCount: 0 });
    }

    const roomName = `dm:${conversationId}:${activeCall.id}`;
    const realParticipantCount = await getLiveKitRoomParticipants(roomName);

    return reply.send({
      activeCall,
      participantCount: realParticipantCount
    });
  });

  // POST /api/calls - Initiate or join existing Group Call atomically
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
      },
      include: {
        conversation: true
      }
    });

    if (!participant) {
      return reply.status(403).send({ error: 'Você não é participante desta conversa.' });
    }

    const conv = participant.conversation;

    // Check if an ACTIVE or RINGING call already exists for this conversation
    let existingCall = await prisma.callSession.findFirst({
      where: {
        conversationId,
        status: { in: ['ACTIVE', 'RINGING'] }
      },
      include: {
        initiator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingCall) {
      // Clear grace timer if someone joins/returns
      if (emptyRoomGraceTimers[existingCall.id]) {
        clearTimeout(emptyRoomGraceTimers[existingCall.id]);
        delete emptyRoomGraceTimers[existingCall.id];
      }

      // If call is RINGING and user joins, transition to ACTIVE
      if (existingCall.status === 'RINGING') {
        existingCall = await prisma.callSession.update({
          where: { id: existingCall.id },
          data: { status: 'ACTIVE', acceptedAt: new Date() },
          include: {
            initiator: {
              select: { id: true, username: true, displayName: true, avatarUrl: true }
            }
          }
        });

        const io = getIo();
        io.to(`user_${user.id}`).emit('dm:call:accepted', existingCall);
      }

      return reply.status(200).send(existingCall);
    }

    // Create a new CallSession
    const call = await prisma.callSession.create({
      data: {
        conversationId,
        initiatorId: user.id,
        type,
        status: conv.type === 'GROUP' ? 'ACTIVE' : 'RINGING',
        acceptedAt: conv.type === 'GROUP' ? new Date() : null,
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

  // POST /api/calls/:id/leave - Idempotent Leave Call
  fastify.post('/:id/leave', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const call = await prisma.callSession.findUnique({
      where: { id },
      include: { conversation: { include: { participants: true } } }
    });

    if (!call) return reply.status(404).send({ error: 'Chamada não encontrada.' });

    const isParticipant = call.conversation.participants.some(p => p.userId === user.id);
    if (!isParticipant) return reply.status(403).send({ error: 'Sem autorização.' });

    const io = getIo();
    const roomName = `dm:${call.conversationId}:${call.id}`;

    // Emit user left to remaining call members
    for (const p of call.conversation.participants) {
      io.to(`user_${p.userId}`).emit('call:participant_left', {
        callId: id,
        userId: user.id,
        conversationId: call.conversationId
      });
    }

    // Check remaining real participants in LiveKit
    const remainingCount = await getLiveKitRoomParticipants(roomName);

    if (call.conversation.type === 'DIRECT') {
      // In 1v1 DM, if one leaves, the call ends immediately
      const endedCall = await prisma.callSession.update({
        where: { id },
        data: { status: 'ENDED', endedAt: new Date() }
      });
      for (const p of call.conversation.participants) {
        io.to(`user_${p.userId}`).emit('dm:call:ended', endedCall);
      }
      return reply.send({ success: true, callStatus: 'ENDED' });
    }

    // In GROUP DM: If room becomes empty, start durable 45-second Grace Period
    if (remainingCount <= 0 && call.status === 'ACTIVE') {
      if (!emptyRoomGraceTimers[id]) {
        console.log(`[CALL GRACE] Starting 45s empty room grace period for call ${id}`);
        emptyRoomGraceTimers[id] = setTimeout(async () => {
          delete emptyRoomGraceTimers[id];

          // Double check LiveKit to ensure no one rejoined
          const recheckCount = await getLiveKitRoomParticipants(roomName);
          if (recheckCount === 0) {
            console.log(`[CALL GRACE] Grace period expired. Ending call ${id}`);
            const endedCall = await prisma.callSession.update({
              where: { id },
              data: { status: 'ENDED', endedAt: new Date() }
            });
            for (const p of call.conversation.participants) {
              io.to(`user_${p.userId}`).emit('dm:call:ended', endedCall);
            }
          }
        }, 45000);
      }
    }

    return reply.send({ success: true, callStatus: call.status, remainingParticipants: remainingCount });
  });

  // POST /api/calls/:id/end - Encerrar Chamada para Todos (Authorized)
  fastify.post('/:id/end', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const call = await prisma.callSession.findUnique({
      where: { id },
      include: { conversation: { include: { participants: true } } }
    });

    if (!call) return reply.status(404).send({ error: 'Chamada não encontrada.' });

    const isParticipant = call.conversation.participants.some(p => p.userId === user.id);
    if (!isParticipant) return reply.status(403).send({ error: 'Sem autorização.' });

    // Authorization check: Only Conversation Owner OR Call Initiator can End For Everyone
    const isOwner = call.conversation.ownerId === user.id;
    const isInitiator = call.initiatorId === user.id;

    if (!isOwner && !isInitiator) {
      return reply.status(403).send({ error: 'Apenas o dono do grupo ou o iniciador pode encerrar a chamada para todos.' });
    }

    // Clear grace timer if active
    if (emptyRoomGraceTimers[id]) {
      clearTimeout(emptyRoomGraceTimers[id]);
      delete emptyRoomGraceTimers[id];
    }

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

  // Accept a call (DM 1:1)
  fastify.post('/:id/accept', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const call = await prisma.callSession.findUnique({
      where: { id },
      include: { conversation: { include: { participants: true } } }
    });

    if (!call) return reply.status(404).send({ error: 'Chamada não encontrada.' });
    
    const isParticipant = call.conversation.participants.some(p => p.userId === user.id);
    if (!isParticipant) return reply.status(403).send({ error: 'Sem autorização.' });

    // Clear grace timer if present
    if (emptyRoomGraceTimers[id]) {
      clearTimeout(emptyRoomGraceTimers[id]);
      delete emptyRoomGraceTimers[id];
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

    if (!call) return reply.status(404).send({ error: 'Chamada não encontrada.' });

    const isParticipant = call.conversation.participants.some(p => p.userId === user.id);
    if (!isParticipant) return reply.status(403).send({ error: 'Sem autorização.' });

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

  // Get LiveKit Token for CallSession
  fastify.post('/:id/token', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const call = await prisma.callSession.findUnique({
      where: { id },
      include: { conversation: { include: { participants: true } } }
    });

    if (!call) return reply.status(404).send({ error: 'Chamada não encontrada.' });

    const isParticipant = call.conversation.participants.some(p => p.userId === user.id);
    if (!isParticipant) return reply.status(403).send({ error: 'Sem autorização.' });

    if (call.status !== 'ACTIVE' && call.status !== 'RINGING') {
      return reply.status(400).send({ error: 'Esta chamada não está mais ativa.' });
    }

    // Clear grace timer if someone requests token to join
    if (emptyRoomGraceTimers[id]) {
      clearTimeout(emptyRoomGraceTimers[id]);
      delete emptyRoomGraceTimers[id];
    }

    const roomName = `dm:${call.conversationId}:${call.id}`;
    const participantName = user.displayName || user.username;

    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return reply.status(500).send({ error: 'Credenciais do LiveKit ausentes no servidor.' });
    }

    const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity: user.id,
      name: participantName,
      metadata: JSON.stringify({ avatarUrl: user.avatarUrl || '' }),
    });
    
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
    
    return reply.send({ token: await at.toJwt(), roomName });
  });

}
