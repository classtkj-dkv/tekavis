import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { isRole } from './_lib/permissions.js';
import { ok, badRequest, forbidden, serverError } from './_lib/response.js';

// Endpoint serbaguna: gabungan search, struktur organisasi, activity log, dan
// notifikasi jadi 1 file. Sengaja digabung supaya total Serverless Function di
// /api tetap di bawah limit 12 punya Vercel Hobby plan (sebelumnya 14 file
// terpisah bikin deployment gagal diam-diam di tahap "Deploying outputs").
// Dibedain lewat query ?resource=search | org-structure | activity-log | notifications
export default requireAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();
  const { resource } = req.query;

  try {
    // ---------------- SEARCH ----------------
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

    // ---------------- STRUKTUR ORGANISASI ----------------
    if (resource === 'org-structure') {
      if (req.method !== 'GET') return badRequest(res, 'Method tidak didukung');
      const { data: roles, error: roleError } = await admin
        .from('roles')
        .select('id, name, label')
        .not('name', 'in', '(owner,admin,siswa)')
        .order('label', { ascending: true });
      if (roleError) throw roleError;

      const { data: members, error: memberError } = await admin
        .from('profiles')
        .select('id, full_name, avatar_url, role_id');
      if (memberError) throw memberError;

      const structure = roles.map(role => ({
        ...role,
        members: members
          .filter(m => m.role_id === role.id)
          .map(m => ({ id: m.id, full_name: m.full_name, avatar_url: m.avatar_url })),
      }));
      return ok(res, structure);
    }

    // ---------------- ACTIVITY LOG ----------------
    if (resource === 'activity-log') {
      if (req.method !== 'GET') return badRequest(res, 'Method tidak didukung');
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

    // ---------------- NOTIFIKASI ----------------
    if (resource === 'notifications') {
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
