
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, avatarUrl: true, bannerUrl: true }
  });
  console.log(users);
}
main().then(() => process.exit(0));

