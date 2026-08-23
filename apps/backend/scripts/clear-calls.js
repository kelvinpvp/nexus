const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function cleanup() {
  const result = await p.callSession.updateMany({
    where: { status: { in: ['RINGING', 'ACTIVE'] } },
    data: { status: 'ENDED', endedAt: new Date() }
  });
  console.log('Cleared stuck calls:', result.count);
  await p.$disconnect();
}

cleanup().catch(console.error);
