const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Manually load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = val;
      }
    }
  });
}

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Fetching last 3 generations...');
    const generations = await prisma.modaGeneration.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { user: true }
    });

    console.log(`Found ${generations.length} records:\n`);
    generations.forEach((gen, idx) => {
      console.log(`[Generation #${idx + 1}]`);
      console.log(`ID: ${gen.id}`);
      console.log(`User: ${gen.user.email}`);
      console.log(`Category: ${gen.category}`);
      console.log(`Model: ${gen.modelId} (${gen.bodySize})`);
      console.log(`Background: ${gen.backgroundId}`);
      console.log(`Status: ${gen.status}`);
      console.log(`Error: ${gen.error}`);
      console.log(`Video URL: ${gen.videoUrl}`);
      console.log(`Front Garment: ${gen.frontGarmUrl.substring(0, 100)}...`);
      console.log(`Created At: ${gen.createdAt}`);
      console.log('--------------------------------------------------');
    });
  } catch (error) {
    console.error('Error fetching generations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
