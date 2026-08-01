import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { optionalAuth } from './_lib/auth.js';
import { isRole } from './_lib/permissions.js';
import { isPublicResource } from './_lib/visibility.js';
import { ok, badRequest, forbidden, unauthorized, serverError } from './_lib/response.js';

// Endpoint serbaguna: gabungan search, struktur organisasi, activity log,
// notifikasi, dan manifest PWA jadi 1 file. Sengaja digabung supaya total
// Serverless Function di /api tetap di bawah limit 12 punya Vercel Hobby
// plan (tiap file .js di /api dihitung 1 function — lebih dari 12 bikin
// deployment gagal). Dibedain lewat query
// ?resource=search | org-structure | activity-log | notifications | manifest
export default optionalAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();
  const { resource } = req.query;

  try {
    // ---------------- MANIFEST PWA (publik, gak lewat ok() karena harus
    // JSON mentah + Content-Type khusus, bukan format {success,data}) ----------------
    if (resource === 'manifest') {
      if (req.method !== 'GET') return badRequest(res, 'Method tidak didukung');
      let siteName = 'Class Tekavis';
      let logoUrl = null;
      try {
        const { data } = await admin.from('site_settings').select('site_name, logo_url').eq('id', 1).single();
        if (data?.site_name) siteName = data.site_name;
        if (data?.logo_url) logoUrl = data.logo_url;
      } catch {
        // Gagal ambil settings (mis. DB down) -> tetap kirim manifest default di bawah,
        // jangan sampai fitur install PWA ikut mati.
      }
      const cloudinaryIcon = (url, size) => {
        if (!url || typeof url !== 'string' || !url.includes('/upload/')) return null;
        return url.replace('/upload/', `/upload/w_${size},h_${size},c_pad,b_auto,f_png,q_auto/`);
      };
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
      return res.status(200).send(JSON.stringify(manifest));
    }

    // ---------------- SEARCH (publik) ----------------
    if (resource === 'search') {
      if (req.method !== 'GET') return badRequest(res, 'Method tidak didukung');
      const q = (req.query.q || '').trim();
      if (!q) return badRequest(res, 'Parameter q wajib diisi');
      const like = `%${q}%`;
      const [students, albums, photos, announcements, schedules] = await Promise.all([
        admin.from('students').select('id, name, major').ilike('name', like).limit(10),
        admin.from('albums').select('id, name, year, month').ilike('name', like).limit(10),
        admin.from('photos').select('id, name, album_id').ilike('name', like).limit(10),
        admin.from('announcements').select('id, title').eq('status', 'published').ilike('title', like).limit(10),
        admin.from('schedules').select('id, subject, teacher').ilike('subject', like).limit(10),
      ]);
      return ok(res, {
        students: students.data || [],
        albums: albums.data || [],
        photos: photos.data || [],
        announcements: announcements.data || [],
        schedules: schedules.data || [],
      });
    }

    // ---------------- STRUKTUR ORGANISASI (publik, kecuali Owner set privat) ----------------
    if (resource === 'org-structure') {
      if (req.method !== 'GET') return badRequest(res, 'Method tidak didukung');
      if (!ctx.profile && !(await isPublicResource(admin, 'struktur'))) {
        return unauthorized(res, 'Struktur organisasi hanya untuk anggota yang login');
      }
      const { data: roles, error: roleError } = await admin
        .from('roles')
        .select('id, name, label')
        .not('name', 'in', '(owner,siswa,pengunjung)')
        .order('label', { ascending: true });
      if (roleError) throw roleError;

      // Wali Kelas (admin) ditaruh paling atas — posisi tertinggi di struktur,
      // sisanya tetap urut abjad label seperti biasa.
      roles.sort((a, b) => {
        if (a.name === 'admin') return -1;
        if (b.name === 'admin') return 1;
        return a.label.localeCompare(b.label);
      });

      const { data: members, error: memberError } = await admin
        .from('profiles')
        .select('id, full_name, avatar_url, role_id, motto, hobby, dream_job');
      if (memberError) throw memberError;

      const structure = roles.map(role => ({
        ...role,
        label: role.name === 'admin' ? 'Wali Kelas' : role.label,
        members: members
          .filter(m => m.role_id === role.id)
          .map(m => ({ id: m.id, full_name: m.full_name, avatar_url: m.avatar_url, motto: m.motto, hobby: m.hobby, dream_job: m.dream_job })),
      }));
      return ok(res, structure);
    }

    // ---------------- ACTIVITY LOG (wajib login) ----------------
    if (resource === 'activity-log') {
      if (req.method !== 'GET') return badRequest(res, 'Method tidak didukung');
      if (!ctx.profile) return unauthorized(res);
      if (!isRole(ctx, 'owner', 'admin')) return forbidden(res, 'Hanya Owner/Admin yang dapat melihat activity log');
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Number(req.query.limit) || 30);
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const { data, error, count } = await admin
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return ok(res, data, { page, limit, total: count });
    }

    // ---------------- NOTIFIKASI (wajib login) ----------------
    if (resource === 'notifications') {
      if (!ctx.profile) return unauthorized(res);
      if (req.method === 'GET') {
        const { data, error } = await admin
          .from('notifications')
          .select('*')
          .eq('user_id', ctx.profile.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return ok(res, data);
      }
      if (req.method === 'PATCH') {
        const { ids } = req.body || {};
        if (!Array.isArray(ids) || ids.length === 0) return badRequest(res, 'ids wajib berupa array');
        const { error } = await admin
          .from('notifications')
          .update({ is_read: true })
          .in('id', ids)
          .eq('user_id', ctx.profile.id);
        if (error) throw error;
        return ok(res, { updated: true });
      }
      return badRequest(res, `Method ${req.method} tidak didukung`);
    }

    return badRequest(res, 'Parameter resource tidak dikenali');
  } catch (err) {
    return serverError(res, err);
  }
});
