import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { ok, badRequest, serverError } from './_lib/response.js';

// GET   /api/notifications  -> notifikasi milik user yang login
// PATCH /api/notifications  -> body: { ids: [...] } tandai sudah dibaca
export default requireAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();
  try {
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
      const { error } = await admin.from('notifications').update({ is_read: true }).in('id', ids).eq('user_id', ctx.profile.id);
      if (error) throw error;
      return ok(res, { updated: true });
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    return serverError(res, err);
  }
});
