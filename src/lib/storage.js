import { put } from '@vercel/blob';
import crypto from 'crypto';

export async function uploadImage(base64Image, customFilename) {
  if (!base64Image) return null;

  // If it's already a public URL, return as-is
  if (typeof base64Image === 'string' && base64Image.startsWith('http')) {
    return base64Image;
  }

  let cleanBase64 = base64Image;
  let mimeType = 'image/jpeg';
  let extension = 'jpg';
  
  if (typeof base64Image === 'string' && base64Image.includes(';base64,')) {
    const parts = base64Image.split(';base64,');
    const match = parts[0].match(/data:(image\/\w+)/);
    if (match) {
      mimeType = match[1];
      extension = mimeType.split('/')[1] || 'jpg';
    }
    cleanBase64 = parts[1];
  }

  const buffer = Buffer.from(cleanBase64, 'base64');
  const randomId = crypto.randomUUID().slice(0, 8);
  const filename = customFilename || `aysa-moda-${Date.now()}-${randomId}.${extension}`;

  console.log(`[Storage] Uploading to Vercel Blob: ${filename} (${mimeType}, ${buffer.length} bytes)...`);

  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: mimeType,
  });

  console.log(`[Storage] Uploaded successfully: ${blob.url}`);
  return blob.url;
}
