import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app, prisma } from '../src/index';

let tokenUserA: string;
let tokenUserB: string;
let userAId: string;
let userBId: string;
let userBUsername: string;

beforeAll(async () => {
  await app.ready();
  
  // Clean up existing test users
  await prisma.user.deleteMany({
    where: { username: { in: ['testuserA', 'testuserB'] } }
  });

  // Register User A
  const resA = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: 'a@test.com',
      username: 'testuserA',
      password: 'password123'
    }
  });
  userAId = resA.json().user.id;

  // Login User A to get token
  const loginA = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email: 'a@test.com',
      password: 'password123'
    }
  });
  tokenUserA = loginA.cookies.find(c => c.name === 'nexus_session')?.value || '';

  // Register User B
  const resB = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: 'b@test.com',
      username: 'testuserB',
      password: 'password123'
    }
  });
  userBId = resB.json().user.id;
  userBUsername = 'testuserB';

  // Login User B to get token
  const loginB = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email: 'b@test.com',
      password: 'password123'
    }
  });
  tokenUserB = loginB.cookies.find(c => c.name === 'nexus_session')?.value || '';
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { username: { in: ['testuserA', 'testuserB'] } }
  });
  await app.close();
  await prisma.$disconnect();
});

describe('Preferences API', () => {
  it('PREF-02 - Should return 401 if not authenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me/preferences'
    });
    expect(res.statusCode).toBe(401);
  });

  it('PREF-01 - Should fetch preferences when authenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me/preferences',
      cookies: { nexus_session: tokenUserA }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().joinMuted).toBe(false);
  });

  it('PREF-03 - Should update joinMuted', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/users/me/preferences',
      cookies: { nexus_session: tokenUserA },
      payload: { joinMuted: true }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().joinMuted).toBe(true);
  });
});

describe('Friends API', () => {
  it('FRIEND-02 - Should not allow adding oneself', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/friends/requests',
      cookies: { nexus_session: tokenUserA },
      payload: { username: 'testuserA' }
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/você não pode/i);
  });

  let requestId: string;

  it('FRIEND-01 - Should send friend request', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/friends/requests',
      cookies: { nexus_session: tokenUserA },
      payload: { username: userBUsername }
    });
    if (res.statusCode === 500) console.log('FRIEND-01 Error:', res.json());
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('PENDING');
    requestId = res.json().id;
  });

  it('FRIEND-03 - Should prevent duplicate request', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/friends/requests',
      cookies: { nexus_session: tokenUserA },
      payload: { username: userBUsername }
    });
    expect(res.statusCode).toBe(400);
  });

  it('FRIEND-05 - Should accept friend request', async () => {
    // User B accepts
    const res = await app.inject({
      method: 'POST',
      url: `/api/friends/requests/${requestId}/accept`,
      cookies: { nexus_session: tokenUserB }
    });
    expect(res.statusCode).toBe(200);

    // Verify friendship exists
    const friendsReq = await app.inject({
      method: 'GET',
      url: '/api/friends',
      cookies: { nexus_session: tokenUserA }
    });
    expect(friendsReq.json().length).toBe(1);
    expect(friendsReq.json()[0].username).toBe(userBUsername);
  });

  it('FRIEND-09 - Should remove friendship', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/friends/${userBId}`,
      cookies: { nexus_session: tokenUserA }
    });
    expect(res.statusCode).toBe(200);

    const friendsReq = await app.inject({
      method: 'GET',
      url: '/api/friends',
      cookies: { nexus_session: tokenUserA }
    });
    expect(friendsReq.json().length).toBe(0);
  });
});

describe('Blocks API', () => {
  it('BLOCK-01 - Should block user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/blocks/${userBId}`,
      cookies: { nexus_session: tokenUserA }
    });
    expect(res.statusCode).toBe(201);
  });

  it('BLOCK-04 - Blocked user cannot send friend request', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/friends/requests',
      cookies: { nexus_session: tokenUserB },
      payload: { username: 'testuserA' }
    });
    expect(res.statusCode).toBe(403);
  });

  it('BLOCK-05 - Should unblock user', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/blocks/${userBId}`,
      cookies: { nexus_session: tokenUserA }
    });
    expect(res.statusCode).toBe(200);
  });
});
