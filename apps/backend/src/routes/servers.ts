import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, MemberRole } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';
import { PermissionService, Permissions, DEFAULT_EVERYONE_PERMISSIONS, ADMIN_ROLE_PERMISSIONS } from '../services/PermissionService';

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

      // Create default @everyone role
      const everyoneRole = await prisma.role.create({
        data: {
          name: '@everyone',
          color: '#99AAB5',
          position: 0,
          permissions: DEFAULT_EVERYONE_PERMISSIONS,
          isDefault: true,
          serverId: server.id
        }
      });

      // Create initial Admin role
      const adminRole = await prisma.role.create({
        data: {
          name: 'Administrador',
          color: '#E91E63',
          position: 100,
          permissions: ADMIN_ROLE_PERMISSIONS,
          isDefault: false,
          serverId: server.id
        }
      });

      // Attach admin role to owner
      const ownerMember = await prisma.serverMember.findUnique({
        where: { userId_serverId: { userId: user.id, serverId: server.id } }
      });

      if (ownerMember) {
        await prisma.serverMemberRole.create({
          data: { memberId: ownerMember.id, roleId: adminRole.id }
        });
      }

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
          roles: true,
          categories: {
            include: { channels: true }
          },
          members: {
            include: { user: true, roles: { include: { role: true } } }
          }
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
          roles: { orderBy: { position: 'desc' } },
          categories: {
            include: {
              channels: {
                include: { overrides: true },
                orderBy: { order: 'asc' }
              }
            },
            orderBy: { order: 'asc' }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  status: true,
                  customStatus: true,
                  bio: true
                }
              },
              roles: {
                include: { role: true }
              }
            }
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

  // --- ROLES MANAGEMENT ---

  // Get server roles
  fastify.get('/:id/roles', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const member = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: user.id, serverId: id } }
    });
    if (!member) return reply.status(403).send({ error: 'Not a member of this server' });

    const roles = await prisma.role.findMany({
      where: { serverId: id },
      orderBy: { position: 'desc' }
    });

    return reply.send(roles);
  });

  // Create role
  fastify.post('/:id/roles', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const schema = z.object({
      name: z.string().min(1).max(32),
      color: z.string().default('#99AAB5'),
      permissions: z.string().optional()
    });

    try {
      const { name, color, permissions } = schema.parse(request.body);

      const server = await prisma.server.findUnique({ where: { id } });
      if (!server) return reply.status(404).send({ error: 'Server not found' });

      const actorMember = await prisma.serverMember.findUnique({
        where: { userId_serverId: { userId: user.id, serverId: id } },
        include: { roles: { include: { role: true } } }
      });
      if (!actorMember) return reply.status(403).send({ error: 'Access denied' });

      const allRoles = await prisma.role.findMany({ where: { serverId: id } });
      const actorPerms = PermissionService.computeServerPermissions(server, actorMember, allRoles);

      if (!PermissionService.hasFlag(actorPerms, Permissions.MANAGE_ROLES)) {
        return reply.status(403).send({ error: 'Missing MANAGE_ROLES permission' });
      }

      const highestPos = Math.max(...allRoles.map(r => r.position), 0);

      const role = await prisma.role.create({
        data: {
          name,
          color,
          position: highestPos + 1,
          permissions: permissions || DEFAULT_EVERYONE_PERMISSIONS,
          serverId: id
        }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          serverId: id,
          actorId: user.id,
          action: 'ROLE_CREATE',
          targetType: 'Role',
          targetId: role.id,
          metadata: { roleName: role.name }
        }
      });

      return reply.status(201).send(role);
    } catch (err) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid input' });
      return reply.status(500).send({ error: 'Failed to create role' });
    }
  });

  // Update role
  fastify.patch('/:id/roles/:roleId', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id, roleId } = request.params as { id: string, roleId: string };

    const schema = z.object({
      name: z.string().min(1).max(32).optional(),
      color: z.string().optional(),
      permissions: z.string().optional(),
      position: z.number().optional()
    });

    try {
      const data = schema.parse(request.body);
      const server = await prisma.server.findUnique({ where: { id } });
      if (!server) return reply.status(404).send({ error: 'Server not found' });

      const targetRole = await prisma.role.findFirst({ where: { id: roleId, serverId: id } });
      if (!targetRole) return reply.status(404).send({ error: 'Role not found' });

      if (targetRole.isDefault && data.name) {
        delete data.name; // Cannot rename @everyone
      }

      const actorMember = await prisma.serverMember.findUnique({
        where: { userId_serverId: { userId: user.id, serverId: id } },
        include: { roles: { include: { role: true } } }
      });
      if (!actorMember) return reply.status(403).send({ error: 'Access denied' });

      const allRoles = await prisma.role.findMany({ where: { serverId: id } });
      const actorPerms = PermissionService.computeServerPermissions(server, actorMember, allRoles);

      if (!PermissionService.hasFlag(actorPerms, Permissions.MANAGE_ROLES)) {
        return reply.status(403).send({ error: 'Missing MANAGE_ROLES permission' });
      }

      if (!PermissionService.canManageRole(server, actorMember, targetRole)) {
        return reply.status(403).send({ error: 'Cannot manage role higher or equal to your highest role' });
      }

      const updated = await prisma.role.update({
        where: { id: roleId },
        data
      });

      await prisma.auditLog.create({
        data: {
          serverId: id,
          actorId: user.id,
          action: 'ROLE_UPDATE',
          targetType: 'Role',
          targetId: roleId,
          metadata: data
        }
      });

      return reply.send(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: 'Invalid input' });
      return reply.status(500).send({ error: 'Failed to update role' });
    }
  });

  // Delete role
  fastify.delete('/:id/roles/:roleId', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id, roleId } = request.params as { id: string, roleId: string };

    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) return reply.status(404).send({ error: 'Server not found' });

    const targetRole = await prisma.role.findFirst({ where: { id: roleId, serverId: id } });
    if (!targetRole) return reply.status(404).send({ error: 'Role not found' });
    if (targetRole.isDefault) return reply.status(400).send({ error: 'Cannot delete @everyone role' });

    const actorMember = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: user.id, serverId: id } },
      include: { roles: { include: { role: true } } }
    });
    if (!actorMember) return reply.status(403).send({ error: 'Access denied' });

    const allRoles = await prisma.role.findMany({ where: { serverId: id } });
    const actorPerms = PermissionService.computeServerPermissions(server, actorMember, allRoles);

    if (!PermissionService.hasFlag(actorPerms, Permissions.MANAGE_ROLES)) {
      return reply.status(403).send({ error: 'Missing MANAGE_ROLES permission' });
    }

    if (!PermissionService.canManageRole(server, actorMember, targetRole)) {
      return reply.status(403).send({ error: 'Cannot delete role higher or equal to your highest role' });
    }

    await prisma.role.delete({ where: { id: roleId } });

    await prisma.auditLog.create({
      data: {
        serverId: id,
        actorId: user.id,
        action: 'ROLE_DELETE',
        targetType: 'Role',
        targetId: roleId,
        metadata: { roleName: targetRole.name }
      }
    });

    return reply.send({ success: true });
  });

  // --- MEMBER MODERATION ---

  // Kick member
  fastify.post('/:id/members/:memberId/kick', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id, memberId } = request.params as { id: string, memberId: string };
    const { reason } = (request.body as { reason?: string }) || {};

    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) return reply.status(404).send({ error: 'Server not found' });

    const actorMember = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: user.id, serverId: id } },
      include: { roles: { include: { role: true } } }
    });
    const targetMember = await prisma.serverMember.findFirst({
      where: { id: memberId, serverId: id },
      include: { roles: { include: { role: true } } }
    });

    if (!actorMember || !targetMember) return reply.status(404).send({ error: 'Member not found' });

    const allRoles = await prisma.role.findMany({ where: { serverId: id } });
    const actorPerms = PermissionService.computeServerPermissions(server, actorMember, allRoles);

    if (!PermissionService.hasFlag(actorPerms, Permissions.KICK_MEMBERS)) {
      return reply.status(403).send({ error: 'Missing KICK_MEMBERS permission' });
    }

    if (!PermissionService.canManageMember(server, actorMember, targetMember)) {
      return reply.status(403).send({ error: 'Hierarchy protection: cannot kick this member' });
    }

    await prisma.serverMember.delete({ where: { id: memberId } });

    await prisma.auditLog.create({
      data: {
        serverId: id,
        actorId: user.id,
        action: 'MEMBER_KICK',
        targetType: 'User',
        targetId: targetMember.userId,
        reason
      }
    });

    return reply.send({ success: true });
  });

  // Ban member
  fastify.post('/:id/members/:memberId/ban', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id, memberId } = request.params as { id: string, memberId: string };
    const { reason } = (request.body as { reason?: string }) || {};

    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) return reply.status(404).send({ error: 'Server not found' });

    const actorMember = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: user.id, serverId: id } },
      include: { roles: { include: { role: true } } }
    });
    const targetMember = await prisma.serverMember.findFirst({
      where: { id: memberId, serverId: id },
      include: { roles: { include: { role: true } } }
    });

    if (!actorMember || !targetMember) return reply.status(404).send({ error: 'Member not found' });

    const allRoles = await prisma.role.findMany({ where: { serverId: id } });
    const actorPerms = PermissionService.computeServerPermissions(server, actorMember, allRoles);

    if (!PermissionService.hasFlag(actorPerms, Permissions.BAN_MEMBERS)) {
      return reply.status(403).send({ error: 'Missing BAN_MEMBERS permission' });
    }

    if (!PermissionService.canManageMember(server, actorMember, targetMember)) {
      return reply.status(403).send({ error: 'Hierarchy protection: cannot ban this member' });
    }

    await prisma.$transaction([
      prisma.serverBan.upsert({
        where: { serverId_userId: { serverId: id, userId: targetMember.userId } },
        create: { serverId: id, userId: targetMember.userId, moderatorId: user.id, reason },
        update: { moderatorId: user.id, reason }
      }),
      prisma.serverMember.delete({ where: { id: memberId } }),
      prisma.auditLog.create({
        data: {
          serverId: id,
          actorId: user.id,
          action: 'MEMBER_BAN',
          targetType: 'User',
          targetId: targetMember.userId,
          reason
        }
      })
    ]);

    return reply.send({ success: true });
  });

  // Assign/Remove member roles
  fastify.post('/:id/members/:memberId/roles', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id, memberId } = request.params as { id: string, memberId: string };
    const { roleIds } = request.body as { roleIds: string[] };

    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) return reply.status(404).send({ error: 'Server not found' });

    const actorMember = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: user.id, serverId: id } },
      include: { roles: { include: { role: true } } }
    });
    const targetMember = await prisma.serverMember.findFirst({
      where: { id: memberId, serverId: id },
      include: { roles: { include: { role: true } } }
    });

    if (!actorMember || !targetMember) return reply.status(404).send({ error: 'Member not found' });

    const allRoles = await prisma.role.findMany({ where: { serverId: id } });
    const actorPerms = PermissionService.computeServerPermissions(server, actorMember, allRoles);

    if (!PermissionService.hasFlag(actorPerms, Permissions.MANAGE_ROLES)) {
      return reply.status(403).send({ error: 'Missing MANAGE_ROLES permission' });
    }

    if (!PermissionService.canManageMember(server, actorMember, targetMember)) {
      return reply.status(403).send({ error: 'Cannot modify roles of member with equal or higher role' });
    }

    // Verify actor can manage each role being added/removed
    for (const rId of roleIds) {
      const r = allRoles.find(role => role.id === rId);
      if (r && !PermissionService.canManageRole(server, actorMember, r)) {
        return reply.status(403).send({ error: `Cannot assign/remove role '${r.name}' higher than your highest role` });
      }
    }

    // Delete existing roles and recreate
    await prisma.serverMemberRole.deleteMany({ where: { memberId } });
    await prisma.serverMemberRole.createMany({
      data: roleIds.map(roleId => ({ memberId, roleId }))
    });

    await prisma.auditLog.create({
      data: {
        serverId: id,
        actorId: user.id,
        action: 'MEMBER_ROLES_UPDATE',
        targetType: 'ServerMember',
        targetId: memberId,
        metadata: { roleIds }
      }
    });

    return reply.send({ success: true });
  });

  // Get server Audit Logs
  fastify.get('/:id/audit-logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const server = await prisma.server.findUnique({ where: { id } });
    if (!server) return reply.status(404).send({ error: 'Server not found' });

    const actorMember = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: user.id, serverId: id } },
      include: { roles: { include: { role: true } } }
    });
    if (!actorMember) return reply.status(403).send({ error: 'Access denied' });

    const allRoles = await prisma.role.findMany({ where: { serverId: id } });
    const actorPerms = PermissionService.computeServerPermissions(server, actorMember, allRoles);

    if (!PermissionService.hasFlag(actorPerms, Permissions.VIEW_AUDIT_LOG)) {
      return reply.status(403).send({ error: 'Missing VIEW_AUDIT_LOG permission' });
    }

    const logs = await prisma.auditLog.findMany({
      where: { serverId: id },
      include: { actor: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return reply.send(logs);
  });

}
