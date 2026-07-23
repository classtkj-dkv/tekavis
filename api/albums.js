import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { requirePermission } from './_lib/permissions.js';
import { logActivity } from './_lib/activityLog.js';
import { ok, created, notFound, badRequest, serverError } from './_lib/response.js';

// GET    /api/albums            -> daftar album (?year=&month= opsional)
// GET    /api/albums?id=...     -> detail album + daftar foto
// POST   /api/albums            -> buat album (manage_gallery)
// PATCH  /api/albums?id=...     -> update album (manage_gallery)
// DELETE /api/albums?id=...     -> hapus album (manage_gallery)
export default requireAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();
  const { id } = req.query;

  try {
    if (req.method === 'GET' && id) {
      const { data: album, error } = await admin.from('albums').select('*').eq('id', id).single();
      if (error || !album) return notFound(res);
      const { data: photos } = await admin
        .from('photos')
        .select('id, url, name, category, tags, location, taken_or_uploaded_at, uploaded_by')
        .eq('album_id', id)
        .order('taken_or_uploaded_at', { ascending: true });
      return ok(res, { ...album, photos: photos || [] });
    }

    if (req.method === 'GET') {
      let query = admin
        .from('albums')
        .select('*, photos(count)')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      if (req.query.year) query = query.eq('year', req.query.year);
      if (req.query.month) query = query.eq('month', req.query.month);
      const { data, error } = await query;
      if (error) throw error;
      return ok(res, data);
    }

    if (req.method === 'POST') {
      requirePermission(ctx, 'manage_gallery');
      const { name, description, cover_url, year, month } = req.body || {};
      if (!name || !year || !month) return badRequest(res, 'Nama, tahun, dan bulan wajib diisi');
      const { data, error } = await admin
        .from('albums')
        .insert({ name, description, cover_url, year, month, created_by: ctx.profile.id })
        .select()
        .single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'create_album', targetTable: 'albums', targetId: data.id });
      return created(res, data);
    }

    if (req.method === 'PATCH') {
      requirePermission(ctx, 'manage_gallery');
      if (!id) return badRequest(res, 'Parameter id wajib diisi');
      const { data, error } = await admin.from('albums').update(req.body || {}).eq('id', id).select().single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'update_album', targetTable: 'albums', targetId: id });
      return ok(res, data);
    }

    if (req.method === 'DELETE') {
      requirePermission(ctx, 'manage_gallery');
      if (!id) return badRequest(res, 'Parameter id wajib diisi');
      const { error } = await admin.from('albums').delete().eq('id', id);
      if (error) throw error;
      await logActivity(req, ctx, { action: 'delete_album', targetTable: 'albums', targetId: id });
      return ok(res, { deleted: true });
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, error: err.message });
    return serverError(res, err);
  }
});
