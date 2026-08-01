import { getSupabaseAdmin } from './_lib/supabaseClient.js';

// GET /api/manifest -> manifest.json PWA yang dinamis, ngikutin identitas
// website yang diatur Owner (nama & logo dari Pengaturan Website), bukan
// file statis — jadi otomatis nyesuain begitu Owner ganti logo, gak perlu
// generate ulang file icon manual.
//
// Logo dari Cloudinary di-resize on-the-fly lewat URL transform
// (w_,h_,c_pad,b_auto) biar pas jadi ikon persegi tanpa motong logonya,
// bukan di-crop paksa.
function cloudinaryIcon(url, size) {
  if (!url || typeof url !== 'string' || !url.includes('/upload/')) return null;
  return url.replace('/upload/', `/upload/w_${size},h_${size},c_pad,b_auto,f_png,q_auto/`);
}

export default async function handler(req, res) {
  let siteName = 'Class Tekavis';
  let logoUrl = null;

  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin.from('site_settings').select('site_name, logo_url').eq('id', 1).single();
    if (data?.site_name) siteName = data.site_name;
    if (data?.logo_url) logoUrl = data.logo_url;
  } catch {
    // Kalau gagal ambil settings (mis. DB lagi down), tetap kirim manifest
    // dengan nilai default di bawah — jangan sampai fitur install PWA ikut mati.
  }

  const icon192 = cloudinaryIcon(logoUrl, 192);
  const icon512 = cloudinaryIcon(logoUrl, 512);

  const manifest = {
    id: '/',
    name: siteName,
    short_name: siteName.length > 12 ? 'Tekavis' : siteName,
    description: `Sistem Informasi Kelas ${siteName}`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0F1117',
    theme_color: '#4F6EF7',
    icons: [
      icon192 ? { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any' } : { src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      icon512 ? { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any' } : { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      icon512 ? { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'maskable' } : { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };

  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
  res.status(200).send(JSON.stringify(manifest));
}
