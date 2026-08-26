import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import argon2 from 'argon2';
import serverRoutes from './routes/servers';
import channelRoutes from './routes/channels';
import gifsRoutes from './routes/gifs';
import { storageRoutes } from './routes/storage';
import { z } from 'zod';
import crypto from 'crypto';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { execSync } from 'child_process';

function isDatabaseUnavailableError(error: unknown) {
  return error instanceof Error && (
    error.name === 'PrismaClientInitializationError' ||
    error.message.includes('P1001') ||
    error.message.includes("Can\\'t reach database server")
  );
}

// Run migrations automatically before anything else.
// The baseline step is only needed once for existing databases, so we keep it
// opt-in to avoid noisy startup failures when the database is temporarily down.
const shouldBaseline = process.env.PRISMA_BASELINE_ON_START === 'true';

if (shouldBaseline) {
  try {
    console.log('Baselining initial migration...');
    execSync('npx prisma migrate resolve --applied "0_init"', { stdio: 'inherit' });
    console.log('Baseline complete.');
  } catch {
    console.log('Baseline skipped (already applied, not needed, or database unavailable).');
  }
}

try {
  console.log('Running database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('Migrations completed successfully.');
} catch {
  console.error('Database migrations could not run right now. The server will still start, but data routes may fail until the database is reachable.');
}

export const prisma = new PrismaClient();
export const app = fastify({ logger: true });

// Register multipart plugin right after app creation
app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  attachFieldsToBody: false
});

// Input Validation Schemas
const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

import voiceRoutes from './routes/voice';
import userRoutes from './routes/users';
import friendRoutes from './routes/friends';
import blockRoutes from './routes/blocks';
import dmRoutes from './routes/dms';
import callRoutes from './routes/calls';
import inviteRoutes from './routes/invites';
import attachmentsRoutes from './routes/attachments';

// Setup Routes

app.register(async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  serverRoutes(fastify, prisma);
}, { prefix: '/api/servers' });

app.register(async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  inviteRoutes(fastify, prisma);
}, { prefix: '/api/invites' });

app.register(async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  // attachmentsRoutes handles multiple prefixes (/api/uploads, /api/attachments, /api/local-storage)
  fastify.register(attachmentsRoutes);
  
  // GIFs
  fastify.register(async (instance) => {
    await gifsRoutes(instance, prisma);
  }, { prefix: '/api/gifs' });
  
  // Storage Proxy (for private B2 buckets)
  fastify.register(storageRoutes, { prefix: '/api/storage' });
});

let ioServer: Server;

app.register(async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  channelRoutes(fastify, prisma, () => ioServer);
}, { prefix: '/api/channels' });

app.register(async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  voiceRoutes(fastify, prisma);
}, { prefix: '/api/voice' });

app.register(async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  userRoutes(fastify, prisma);
}, { prefix: '/api/users' });

app.register(async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  friendRoutes(fastify, prisma, () => ioServer);
}, { prefix: '/api/friends' });

app.register(async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  blockRoutes(fastify, prisma, () => ioServer);
}, { prefix: '/api/blocks' });

app.register(async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  dmRoutes(fastify, prisma, () => ioServer);
}, { prefix: '/api/dms' });

app.register(async (fastify) => {
  fastify.addHook('preHandler', authenticate);
  callRoutes(fastify, prisma, () => ioServer);
}, { prefix: '/api/calls' });

// Setup Plugins

app.register(fastifyStatic, {
  root: path.join(__dirname, '../uploads'),
  prefix: '/uploads/',
});

app.register(cors, {
  origin: (origin, cb) => {
    // Allow Tauri Origins
    const tauriOrigins = ['http://tauri.localhost', 'https://tauri.localhost', 'tauri://localhost', 'asset://localhost'];
    if (!origin || tauriOrigins.includes(origin)) {
      return cb(null, true);
    }
    
    if (process.env.WEB_URL) {
      const allowed = process.env.WEB_URL.split(',');
      if (allowed.includes(origin)) {
        return cb(null, true);
      }
    } else {
      return cb(null, true); // Fallback se não tiver WEB_URL
    }
    
    cb(new Error("Not allowed"), false);
  },
  credentials: true,
});

app.register(cookie);

// Middleware to check authentication
const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  const sessionId = request.cookies.nexus_session;
  if (!sessionId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  let sessionRecord;
  try {
    sessionRecord = await prisma.session.findUnique({
      where: { token: sessionId },
      include: { user: true },
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE' });
    }
    throw error;
  }

  if (!sessionRecord || sessionRecord.expiresAt < new Date()) {
    reply.clearCookie('nexus_session');
    return reply.status(401).send({ error: 'Session expired or invalid' });
  }

  (request as any).user = sessionRecord.user;
};

// Health check
app.get('/api/health', async () => {
  return { status: 'ok' };
});

// --- AUTHENTICATION ROUTES ---

app.post('/api/auth/register', async (request, reply) => {
  try {
    const { email, username, password } = registerSchema.parse(request.body);
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedUsername = username.trim();

    const existingUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: normalizedEmail }, 
          // Use Prisma's case-insensitive mode if possible, but for now exact match trimmed
          { username: trimmedUsername }
        ] 
      },
    });

    if (existingUser) {
      app.log.warn(`auth.register.failed reason=conflict email=${normalizedEmail} username=${trimmedUsername}`);
      return reply.status(400).send({
        error: existingUser.email === normalizedEmail ? 'AUTH_EMAIL_TAKEN' : 'AUTH_USERNAME_TAKEN'
      });
    }

    const passwordHash = await argon2.hash(password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username: trimmedUsername,
        password: passwordHash,
      },
    });

    return reply.status(201).send({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        bio: user.bio,
        customStatus: user.customStatus,
        status: user.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      app.log.warn(`auth.register.failed reason=validation`);
      return reply.status(400).send({ error: 'AUTH_VALIDATION_FAILED', details: error.errors });
    }
    if (isDatabaseUnavailableError(error)) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE' });
    }
    app.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (request, reply) => {
  try {
    const { email, password } = loginSchema.parse(request.body);
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      app.log.warn(`auth.login.failed reason=invalid_credentials email=${normalizedEmail}`);
      return reply.status(401).send({ error: 'AUTH_INVALID_CREDENTIALS' });
    }

    const validPassword = await argon2.verify(user.password, password);
    if (!validPassword) {
      app.log.warn(`auth.login.failed reason=invalid_credentials email=${normalizedEmail}`);
      return reply.status(401).send({ error: 'AUTH_INVALID_CREDENTIALS' });
    }

    // Generate secure session token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    reply.setCookie('nexus_session', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    });

    return reply.send({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        bio: user.bio,
        customStatus: user.customStatus,
        status: user.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      app.log.warn(`auth.login.failed reason=validation`);
      return reply.status(400).send({ error: 'AUTH_VALIDATION_FAILED', details: error.errors });
    }
    if (isDatabaseUnavailableError(error)) {
      return reply.status(503).send({ error: 'DATABASE_UNAVAILABLE' });
    }
    app.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', async (request, reply) => {
  const sessionId = request.cookies.nexus_session;
  
  if (sessionId) {
    try {
      await prisma.session.deleteMany({
        where: { token: sessionId },
      });
    } catch (error) {
      if (!isDatabaseUnavailableError(error)) {
        throw error;
      }
    }
    reply.clearCookie('nexus_session');
  }

  return reply.send({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
  const user = (request as any).user;
  return reply.send({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      customStatus: user.customStatus,
      status: user.status,
    }
  });
});

// Start the server
const start = async () => {
  try {
    const port = Number(process.env.PORT || 4000);
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server running on http://localhost:${port}`);

    ioServer = new Server(app.server, {
      cors: {
        origin: (origin, cb) => {
          const tauriOrigins = ['http://tauri.localhost', 'https://tauri.localhost', 'tauri://localhost', 'asset://localhost'];
          if (!origin || tauriOrigins.includes(origin)) return cb(null, true);
          if (process.env.WEB_URL) {
            const allowed = process.env.WEB_URL.split(',');
            if (allowed.includes(origin)) return cb(null, true);
          } else {
            return cb(null, true);
          }
          cb(new Error("Not allowed"), false);
        },
        credentials: true,
      },
    });

    interface VoiceState {
      userId: string;
      username: string;
      avatarUrl: string | null;
      channelId: string;
      isMuted: boolean;
      isDeafened: boolean;
    }
    
    const activeVoiceStates = new Map<string, VoiceState>(); // socketId -> VoiceState
    const activeUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds (for multi-session presence)

    // Socket Middleware for Authentication
    ioServer.use(async (socket, next) => {
      try {
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) return next(new Error('Authentication error'));
        
        const cookieString = cookies.split(';').find(c => c.trim().startsWith('nexus_session='));
        if (!cookieString) return next(new Error('Authentication error'));
        
        const token = cookieString.split('=')[1];
        
        const sessionRecord = await prisma.session.findUnique({
          where: { token },
          include: { user: true },
        });

        if (!sessionRecord || sessionRecord.expiresAt < new Date()) {
          return next(new Error('Authentication error'));
        }

        (socket as any).user = sessionRecord.user;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    ioServer.on('connection', async (socket) => {
      const user = (socket as any).user;
      app.log.info(`Authenticated Socket connected: ${socket.id} (User: ${user.username})`);
      
      // Join a personal room for direct events (e.g. friend requests)
      socket.join(`user_${user.id}`);

      // Presence Logic (Multi-session support)
      let userSockets = activeUsers.get(user.id) || new Set();
      userSockets.add(socket.id);
      activeUsers.set(user.id, userSockets);

      // If this is the first connection for this user, broadcast presence ONLINE
      if (userSockets.size === 1) {
        await prisma.user.update({ where: { id: user.id }, data: { status: 'ONLINE' } });
        ioServer.emit('presence:update', { userId: user.id, status: 'ONLINE' });
      }

      // Voice logic
      socket.on('join_channel', (channelId: string) => {
        socket.join(channelId);
      });

      socket.on('leave_channel', (channelId: string) => {
        socket.leave(channelId);
      });

      socket.emit('voice_states_update', Array.from(activeVoiceStates.values()));

      socket.on('join_voice', (data: { channelId: string }) => {
        const state: VoiceState = {
          userId: user.id, // TRUST SERVER AUTH, NOT CLIENT
          username: user.username,
          avatarUrl: user.avatarUrl || null,
          channelId: data.channelId,
          isMuted: false,
          isDeafened: false,
        };
        activeVoiceStates.set(socket.id, state);
        ioServer.emit('voice_states_update', Array.from(activeVoiceStates.values()));
      });

      socket.on('leave_voice', () => {
        if (activeVoiceStates.has(socket.id)) {
          activeVoiceStates.delete(socket.id);
          ioServer.emit('voice_states_update', Array.from(activeVoiceStates.values()));
        }
      });

      socket.on('update_voice_state', (data: { isMuted: boolean, isDeafened: boolean }) => {
        const state = activeVoiceStates.get(socket.id);
        if (state) {
          state.isMuted = data.isMuted;
          state.isDeafened = data.isDeafened;
          ioServer.emit('voice_states_update', Array.from(activeVoiceStates.values()));
        }
      });

      socket.on('disconnect', async () => {
        app.log.info(`Socket disconnected: ${socket.id}`);
        
        // Voice cleanup
        if (activeVoiceStates.has(socket.id)) {
          activeVoiceStates.delete(socket.id);
          ioServer.emit('voice_states_update', Array.from(activeVoiceStates.values()));
        }

        // Presence cleanup
        let uSockets = activeUsers.get(user.id);
        if (uSockets) {
          uSockets.delete(socket.id);
          if (uSockets.size === 0) {
            activeUsers.delete(user.id);
            // Grace period could be implemented here with Redis/setTimeout
            await prisma.user.update({ where: { id: user.id }, data: { status: 'OFFLINE' } });
            ioServer.emit('presence:update', { userId: user.id, status: 'OFFLINE' });
          }
        }
      });
    });

  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Start the server only if run directly (not imported in tests)
if (require.main === module) {
  start();
}
