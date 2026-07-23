import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { requirePermission, isRole } from './_lib/permissions.js';
import { logActivity } from './_lib/activityLog.js';
import { ok, created, badRequest, serverError } from './_lib/response.js';

// GET    /api/announcements          -> published untuk semua; draft/scheduled hanya yang punya izin
// POST   /api/announcements          -> buat pengumuman (manage_announcements)
// PATCH  /api/announcements?id=...   -> edit (manage_announcements)
// DELETE /api/announcements?id=...   -> hapus (manage_announcements)
export default requireAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const canManage = isRole(ctx, 'owner') || ctx.profile?.roles?.permissions?.manage_announcements;
      let query = admin.from('announcements').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
      if (!canManage) query = query.eq('status', 'published');
      const { data, error } = await query;
      if (error) throw error;
      return ok(res, data);
    }

    if (req.method === 'POST') {
      requirePermission(ctx, 'manage_announcements');
      const { title, content, image_url, attachment_url, is_pinned, status, publish_at } = req.body || {};
      if (!title || !content) return badRequest(res, 'Judul dan isi wajib diisi');
      const { data, error } = await admin
        .from('announcements')
        .insert({
          title, content, image_url, attachment_url,
          is_pinned: Boolean(is_pinned),
          status: status || 'draft',
          publish_at: publish_at || null,
          created_by: ctx.profile.id,
        })
        .select()
        .single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'create_announcement', targetTable: 'announcements', targetId: data.id });
      return created(res, data);
    }

    if (req.method === 'PATCH') {
      requirePermission(ctx, 'manage_announcements');
      if (!id) return badRequest(res, 'Parameter id wajib diisi');
      const { data, error } = await admin.from('announcements').update(req.body || {}).eq('id', id).select().single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'update_announcement', targetTable: 'announcements', targetId: id });
      return ok(res, data);
    }

    if (req.method === 'DELETE') {
      requirePermission(ctx, 'manage_announcements');
      if (!id) return badRequest(res, 'Parameter id wajib diisi');
      const { error } = await admin.from('announcements').delete().eq('id', id);
      if (error) throw error;
      await logActivity(req, ctx, { action: 'delete_announcement', targetTable: 'announcements', targetId: id });
      return ok(res, { deleted: true });
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, error: err.message });
    return serverError(res, err);
  }
});
