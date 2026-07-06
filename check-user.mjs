import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.modaUser.findUnique({
    where: { email: 'samed@karneyn.com' }
  });
  
  if (user) {
    console.log('✅ Kullanıcı BULUNDU:');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Plan:', user.plan);
    console.log('Credits:', user.credits);
    console.log('Password hash (ilk 20 karakter):', user.password?.substring(0, 20));
    console.log('CreatedAt:', user.createdAt);
  } else {
    console.log('❌ Kullanıcı BULUNAMADI: samed@karneyn.com');
  }
  
  const count = await prisma.modaUser.count();
  console.log('Toplam kullanıcı sayısı:', count);
  
  const allUsers = await prisma.modaUser.findMany({ select: { email: true, plan: true, credits: true } });
  console.log('Tüm kullanıcılar:', JSON.stringify(allUsers, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
