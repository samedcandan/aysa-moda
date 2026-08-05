import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const DATABASE_URL = "postgresql://neondb_owner:npg_EmAxuC3jS7Le@ep-lucky-math-allbgllc-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
process.env.DATABASE_URL = DATABASE_URL;

const prisma = new PrismaClient();

async function main() {
  const email = 'samed@karneyn.com';
  const newPassword = 'Karneyn123*';
  const hashedPassword = bcrypt.hashSync(newPassword, 10);

  const existing = await prisma.modaUser.findUnique({
    where: { email: email }
  });

  if (existing) {
    await prisma.modaUser.update({
      where: { email: email },
      data: { password: hashedPassword, plan: 'PRO', credits: 9999 }
    });
    console.log(`✅ ${email} hesabının şifresi '${newPassword}' olarak güncellendi (Plan: PRO, Kredi: 9999).`);
  } else {
    await prisma.modaUser.create({
      data: {
        email: email,
        password: hashedPassword,
        name: 'Samed Candan',
        plan: 'PRO',
        credits: 9999
      }
    });
    console.log(`✅ ${email} hesabı '${newPassword}' şifresiyle YENİDEN OLUŞTURULDU (Plan: PRO, Kredi: 9999).`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
