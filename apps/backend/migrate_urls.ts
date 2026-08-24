import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany();
  let updated = 0;
  
  const backendUrl = process.env.API_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
  const prefix = `${backendUrl.replace(/\/$/, '')}/api/storage`;

  for (const user of users) {
    let changed = false;
    let data: any = {};
    
    if (user.avatarUrl && user.avatarUrl.includes('s3.us-east-005.backblazeb2.com')) {
      const match = user.avatarUrl.match(/nexus-uploads-k\/(profiles\/.*)/);
      if (match) {
        data.avatarUrl = `${prefix}/${match[1]}`;
        changed = true;
      }
    }
    
    if (user.bannerUrl && user.bannerUrl.includes('s3.us-east-005.backblazeb2.com')) {
      const match = user.bannerUrl.match(/nexus-uploads-k\/(profiles\/.*)/);
      if (match) {
        data.bannerUrl = `${prefix}/${match[1]}`;
        changed = true;
      }
    }
    
    if (changed) {
      await prisma.user.update({
        where: { id: user.id },
        data
      });
      updated++;
    }
  }
  
  console.log(`Updated ${updated} users`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
