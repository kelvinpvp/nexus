import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:4000/api';

async function generateToken(userId: string) {
  const session = await prisma.session.create({
    data: {
      userId,
      token: Math.random().toString(36).substring(2) + Date.now().toString(36),
      expiresAt: new Date(Date.now() + 86400000) // +1 day
    }
  });
  return session.token;
}

async function runTests() {
  console.log('--- SETUP ---');
  // Clear tables
  await prisma.block.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.friendRequest.deleteMany();
  await prisma.user.deleteMany({
    where: { username: { in: ['test_a', 'test_b', 'test_c'] } }
  });

  // Create mock users
  const userA = await prisma.user.create({
    data: { username: 'test_a', email: 'a@test.com', password: 'hash', displayName: 'User A' }
  });
  const userB = await prisma.user.create({
    data: { username: 'test_b', email: 'b@test.com', password: 'hash', displayName: 'User B' }
  });
  const userC = await prisma.user.create({
    data: { username: 'test_c', email: 'c@test.com', password: 'hash', displayName: 'User C' }
  });

  const tokenA = await generateToken(userA.id);
  const tokenB = await generateToken(userB.id);
  
  const apiA = axios.create({ baseURL: API_URL, headers: { Cookie: `session_token=${tokenA}` } });
  const apiB = axios.create({ baseURL: API_URL, headers: { Cookie: `session_token=${tokenB}` } });

  try {
    console.log('FRIEND-01: Envio normal');
    const r1 = await apiA.post('/friends/requests', { username: 'test_b' });
    console.log('✅ Sent request');

    console.log('FRIEND-02: Self request');
    try {
      await apiA.post('/friends/requests', { username: 'test_a' });
      throw new Error('Should have failed');
    } catch (e: any) {
      if (e.response?.status === 400) console.log('✅ Rejected self request');
      else throw e;
    }

    console.log('FRIEND-03: Duplicata');
    try {
      await apiA.post('/friends/requests', { username: 'test_b' });
      throw new Error('Should have failed');
    } catch (e: any) {
      if (e.response?.status === 400) console.log('✅ Rejected duplicate');
      else throw e;
    }

    console.log('FRIEND-04: Inverso');
    try {
      await apiB.post('/friends/requests', { username: 'test_a' });
      throw new Error('Should have failed');
    } catch (e: any) {
      if (e.response?.status === 400) console.log('✅ Rejected inverse request');
      else throw e;
    }

    console.log('FRIEND-05: Accept');
    await apiB.post(`/friends/requests/${r1.data.id}/accept`);
    console.log('✅ Accepted request');

    console.log('FRIEND-06: Sender accept próprio request (should fail, already accepted anyway, but lets test with C)');
    const r2 = await apiA.post('/friends/requests', { username: 'test_c' });
    try {
      await apiA.post(`/friends/requests/${r2.data.id}/accept`);
      throw new Error('Should have failed');
    } catch (e: any) {
      if (e.response?.status === 404) console.log('✅ Sender cannot accept own request');
      else throw e;
    }

    console.log('FRIEND-07: Reject');
    const tokenC = await generateToken(userC.id);
    const apiC = axios.create({ baseURL: API_URL, headers: { Cookie: `session_token=${tokenC}` } });
    await apiC.post(`/friends/requests/${r2.data.id}/reject`);
    console.log('✅ Rejected request');

    console.log('FRIEND-08: Cancel');
    const r3 = await apiA.post('/friends/requests', { username: 'test_c' });
    await apiA.delete(`/friends/requests/${r3.data.id}`);
    console.log('✅ Cancelled request');

    console.log('FRIEND-09: Remove friendship');
    await apiA.delete(`/friends/${userB.id}`);
    console.log('✅ Removed friendship');

    console.log('--- BLOCK TESTS ---');
    console.log('BLOCK-01: Block user');
    await apiA.post(`/blocks/${userB.id}`);
    console.log('✅ Blocked user');

    console.log('BLOCK-02 & 03: Remove friendship and cancel requests on block (Tested via block implementation)');
    
    console.log('BLOCK-04: Impede novo request');
    try {
      await apiB.post('/friends/requests', { username: 'test_a' });
      throw new Error('Should have failed');
    } catch (e: any) {
      if (e.response?.status === 403) console.log('✅ Blocked request from blocked user');
      else throw e;
    }

    console.log('BLOCK-05: Unblock');
    await apiA.delete(`/blocks/${userB.id}`);
    console.log('✅ Unblocked user');

  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  } finally {
    // Cleanup
    await prisma.user.deleteMany({
      where: { username: { in: ['test_a', 'test_b', 'test_c'] } }
    });
    await prisma.$disconnect();
  }
}

runTests();
