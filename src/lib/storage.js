import { put } from '@vercel/blob';
import crypto from 'crypto';

const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '5fb1b117f6d7a5c72cbe86839484c286';

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

  // 1. Try Vercel Blob if BLOB_READ_WRITE_TOKEN is configured
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const buffer = Buffer.from(cleanBase64, 'base64');
      const randomId = crypto.randomUUID().slice(0, 8);
      const filename = customFilename || `aysa-moda-${Date.now()}-${randomId}.${extension}`;

      console.log(`[Storage] Uploading to Vercel Blob: ${filename}...`);

      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: mimeType,
      });

      console.log(`[Storage] Vercel Blob uploaded successfully: ${blob.url}`);
      return blob.url;
    } catch (vercelError) {
      console.warn(`[Storage] Vercel Blob failed, falling back to ImgBB:`, vercelError.message);
    }
  }

  // 2. ImgBB Upload (Fallback / Default when Vercel Blob token is missing)
  try {
    console.log(`[Storage] Uploading to ImgBB...`);
    const formData = new URLSearchParams();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', cleanBase64);

    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (data.success && data.data?.url) {
      console.log(`[Storage] ImgBB uploaded successfully: ${data.data.url}`);
      return data.data.url;
    } else {
      throw new Error(data.error?.message || 'ImgBB yükleme başarısız.');
    }
  } catch (imgbbError) {
    console.error(`[Storage] ImgBB upload error:`, imgbbError);
    throw new Error(`Görsel yüklenemedi: ${imgbbError.message}`);
  }
}

