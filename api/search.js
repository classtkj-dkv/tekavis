import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { ok, badRequest, serverError } from './_lib/response.js';

// GET /api/search?q=...  -> cari di students, albums, photos, announcements(published), schedules
export default requireAuth(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return badRequest(res, 'Parameter q wajib diisi');
  try {
    const admin = getSupabaseAdmin();
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
  } catch (err) {
    return serverError(res, err);
  }
});
