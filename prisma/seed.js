import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const username = process.env.OWNER_USERNAME || "KikoEnakTau";
const password = process.env.OWNER_PASSWORD;

if (!password || password === "CHANGE_THIS_BEFORE_DEPLOY") {
  console.error("Set OWNER_PASSWORD in .env before seeding the owner.");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);

await prisma.user.upsert({
  where: { username },
  update: { passwordHash, role: "OWNER", active: true },
  create: { username, passwordHash, role: "OWNER", active: true }
});

console.log(`Owner ready: ${username}`);
await prisma.$disconnect();