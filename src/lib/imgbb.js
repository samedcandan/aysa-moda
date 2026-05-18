/**
 * ImgBB Upload Helper
 * Görsel dosyalarını ImgBB'ye yükleyip public URL döndürür
 */

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

export async function uploadToImgBB(base64Image) {
  if (!IMGBB_API_KEY) {
    throw new Error('IMGBB_API_KEY ortam değişkeni tanımlı değil.');
  }

  // Remove data:image/...;base64, prefix if present
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', cleanBase64);

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error('ImgBB yükleme hatası: ' + (data.error?.message || 'Bilinmeyen hata'));
  }

  return data.data.url;
}
