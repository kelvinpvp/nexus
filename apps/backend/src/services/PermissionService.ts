// Bitfield flags for Nexus Community System
export const Permissions = {
  ADMINISTRATOR: 1n << 0n,           // Bypass all server permissions (except Owner superiority)
  VIEW_AUDIT_LOG: 1n << 1n,          // View server audit log
  MANAGE_SERVER: 1n << 2n,           // Edit server name, icon, settings
  MANAGE_ROLES: 1n << 3n,            // Create, edit, delete, reorder lower roles
  MANAGE_CHANNELS: 1n << 4n,         // Create, edit, delete, reorder channels
  MANAGE_INVITES: 1n << 5n,          // View and revoke server invites
  KICK_MEMBERS: 1n << 6n,            // Kick lower hierarchy members
  BAN_MEMBERS: 1n << 7n,             // Ban lower hierarchy members
  TIMEOUT_MEMBERS: 1n << 8n,         // Timeout lower hierarchy members
  MANAGE_NICKNAMES: 1n << 9n,        // Change nicknames of lower members
  CHANGE_NICKNAME: 1n << 10n,        // Change own nickname
  
  // Text Channel Permissions
  VIEW_CHANNEL: 1n << 11n,           // Read text channel / see voice channel
  SEND_MESSAGES: 1n << 12n,          // Send text messages
  MANAGE_MESSAGES: 1n << 13n,        // Delete/pin messages of other users
  READ_MESSAGE_HISTORY: 1n << 14n,   // Read past message history
  ATTACH_FILES: 1n << 15n,          // Upload files / attachments
  EMBED_LINKS: 1n << 16n,           // Post links that embed
  ADD_REACTIONS: 1n << 17n,         // Add reactions to messages
  MENTION_EVERYONE: 1n << 18n,      // Mention @everyone, @here, all roles

  // Voice Channel Permissions
  CONNECT: 1n << 19n,                // Join voice channel
  SPEAK: 1n << 20n,                  // Speak in voice channel
  VIDEO: 1n << 21n,                  // Publish camera video
  SCREEN_SHARE: 1n << 22n,           // Share screen
  MUTE_MEMBERS: 1n << 23n,           // Server mute member in voice
  DEAFEN_MEMBERS: 1n << 24n,         // Server deafen member in voice
  MOVE_MEMBERS: 1n << 25n,           // Move member between voice channels
  DISCONNECT_MEMBERS: 1n << 26n,     // Disconnect member from voice channel
  PRIORITY_SPEAKER: 1n << 27n,       // Priority speaker volume boost
  CREATE_INSTANT_INVITE: 1n << 28n,  // Create instant server invite
} as const;

// Default permissions for @everyone role upon server creation
export const DEFAULT_EVERYONE_PERMISSIONS = (
  Permissions.VIEW_CHANNEL |
  Permissions.SEND_MESSAGES |
  Permissions.READ_MESSAGE_HISTORY |
  Permissions.ATTACH_FILES |
  Permissions.EMBED_LINKS |
  Permissions.ADD_REACTIONS |
  Permissions.CHANGE_NICKNAME |
  Permissions.CONNECT |
  Permissions.SPEAK |
  Permissions.VIDEO |
  Permissions.SCREEN_SHARE |
  Permissions.CREATE_INSTANT_INVITE
).toString();

// Default permissions for Administrator role
export const ADMIN_ROLE_PERMISSIONS = (Permissions.ADMINISTRATOR).toString();

export class PermissionService {
  /**
   * Parse permission string or BigInt safely
   */
  static parse(permStr: string | bigint | number | undefined | null): bigint {
    if (permStr === undefined || permStr === null) return 0n;
    try {
      return BigInt(permStr);
    } catch {
      return 0n;
    }
  }

  /**
   * Check if computed permissions include a specific flag
   */
  static hasFlag(permissions: bigint, flag: bigint): boolean {
    if ((permissions & Permissions.ADMINISTRATOR) === Permissions.ADMINISTRATOR) {
      return true; // ADMINISTRATOR bypass
    }
    return (permissions & flag) === flag;
  }

  /**
   * Compute server-wide permissions for a member (combining @everyone and member roles)
   */
  static computeServerPermissions(
    server: { ownerId: string },
    member: { userId: string; roles: { role: { isDefault: boolean; permissions: string } }[] },
    roles: { isDefault: boolean; permissions: string }[]
  ): bigint {
    // 1. Server Owner has full bypass
    if (server.ownerId === member.userId) {
      return ~0n; // All bits set to 1
    }

    let computed = 0n;

    // 2. Add @everyone role permissions
    const everyoneRole = roles.find(r => r.isDefault);
    if (everyoneRole) {
      computed |= this.parse(everyoneRole.permissions);
    }

    // 3. Combine permissions from assigned roles
    for (const r of member.roles) {
      computed |= this.parse(r.role.permissions);
    }

    // 4. If ADMINISTRATOR bit is set, grant all
    if ((computed & Permissions.ADMINISTRATOR) === Permissions.ADMINISTRATOR) {
      return ~0n;
    }

    return computed;
  }

  /**
   * Compute channel-specific permissions considering channel overrides
   */
  static computeChannelPermissions(
    server: { ownerId: string },
    member: { id: string; userId: string; roles: { role: { id: string; isDefault: boolean; permissions: string } }[] },
    allServerRoles: { id: string; isDefault: boolean; permissions: string }[],
    channelOverrides: { roleId?: string | null; memberId?: string | null; allow: string; deny: string }[]
  ): bigint {
    // 1. Owner always has full access
    if (server.ownerId === member.userId) {
      return ~0n;
    }

    // 2. Base server permissions
    let permissions = this.computeServerPermissions(server, member, allServerRoles);

    // If ADMINISTRATOR is present, channel overrides cannot deny access
    if ((permissions & Permissions.ADMINISTRATOR) === Permissions.ADMINISTRATOR) {
      return ~0n;
    }

    // 3. Channel @everyone override
    const everyoneRole = allServerRoles.find(r => r.isDefault);
    if (everyoneRole) {
      const everyoneOverride = channelOverrides.find(o => o.roleId === everyoneRole.id);
      if (everyoneOverride) {
        permissions &= ~this.parse(everyoneOverride.deny);
        permissions |= this.parse(everyoneOverride.allow);
      }
    }

    // 4. Role overrides (combine ALLOWs and DENYs from user's roles)
    let roleAllow = 0n;
    let roleDeny = 0n;
    for (const memberRole of member.roles) {
      const override = channelOverrides.find(o => o.roleId === memberRole.role.id);
      if (override) {
        roleAllow |= this.parse(override.allow);
        roleDeny |= this.parse(override.deny);
      }
    }

    permissions &= ~roleDeny;
    permissions |= roleAllow;

    // 5. Member-specific override (highest precedence)
    const memberOverride = channelOverrides.find(o => o.memberId === member.id);
    if (memberOverride) {
      permissions &= ~this.parse(memberOverride.deny);
      permissions |= this.parse(memberOverride.allow);
    }

    return permissions;
  }

  /**
   * Determine highest role position for hierarchy comparison
   */
  static getHighestRolePosition(
    server: { ownerId: string },
    member: { userId: string; roles: { role: { position: number } }[] }
  ): number {
    if (server.ownerId === member.userId) {
      return Number.MAX_SAFE_INTEGER; // Owner is top of hierarchy
    }

    let highest = 0;
    for (const r of member.roles) {
      if (r.role.position > highest) {
        highest = r.role.position;
      }
    }
    return highest;
  }

  /**
   * Validate if actor can manage or moderate target member based on hierarchy rules
   */
  static canManageMember(
    server: { ownerId: string },
    actorMember: { userId: string; roles: { role: { position: number } }[] },
    targetMember: { userId: string; roles: { role: { position: number } }[] }
  ): boolean {
    // Cannot moderate/manage server owner
    if (targetMember.userId === server.ownerId) {
      return false;
    }

    // Server owner can manage anyone
    if (actorMember.userId === server.ownerId) {
      return true;
    }

    const actorHighest = this.getHighestRolePosition(server, actorMember);
    const targetHighest = this.getHighestRolePosition(server, targetMember);

    // Actor must strictly outrank target
    return actorHighest > targetHighest;
  }

  /**
   * Validate if actor can manage a role based on position
   */
  static canManageRole(
    server: { ownerId: string },
    actorMember: { userId: string; roles: { role: { position: number } }[] },
    targetRole: { position: number }
  ): boolean {
    if (actorMember.userId === server.ownerId) {
      return true;
    }

    const actorHighest = this.getHighestRolePosition(server, actorMember);
    return actorHighest > targetRole.position;
  }
}
