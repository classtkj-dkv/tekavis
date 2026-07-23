import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload file (base64 / buffer / remote url) ke Cloudinary.
 * Hanya mengembalikan data teknis (public_id, url, dsb) untuk disimpan
 * sebagai referensi di database. Detail yang tampil ke user (nama foto,
 * deskripsi, tag, lokasi, dll) selalu berasal dari metadata Supabase,
 * BUKAN dari nama file / public_id Cloudinary.
 */
export async function uploadImage(file, { folder = 'kelas-cms' } = {}) {
  const result = await cloudinary.uploader.upload(file, {
    folder,
    resource_type: 'image',
  });
  return {
    publicId: result.public_id,
    url: result.secure_url,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

export async function deleteImage(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
