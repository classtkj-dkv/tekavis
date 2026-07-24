import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { isRole } from './_lib/permissions.js';
import { logActivity } from './_lib/activityLog.js';
import { ok, forbidden, badRequest, serverError } from './_lib/response.js';

// GET   /api/users        -> daftar user + role (Owner & Admin)
// PATCH /api/users        -> body: { user_id, role_id } ganti role (Owner)
export default requireAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      if (!isRole(ctx, 'owner', 'admin')) return forbidden(res, 'Hanya Owner/Admin yang dapat mengelola user');
      const { data, error } = await admin
        .from('profiles')
        .select('id, full_name, avatar_url, roles(id, name, label)')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return ok(res, data);
    }

    if (req.method === 'PATCH') {
      if (!isRole(ctx, 'owner')) return forbidden(res, 'Hanya Owner yang dapat mengubah role user');
      const { user_id, role_id } = req.body || {};
      if (!user_id || !role_id) return badRequest(res, 'user_id dan role_id wajib diisi');

      const { data: target } = await admin.from('profiles').select('id, roles(name)').eq('id', user_id).single();
      if (target?.roles?.name === 'owner') return forbidden(res, 'Role Owner tidak dapat diubah lewat endpoint ini');

      const { data, error } = await admin.from('profiles').update({ role_id }).eq('id', user_id).select().single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'change_user_role', targetTable: 'profiles', targetId: user_id, meta: { role_id } });
      return ok(res, data);
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    return serverError(res, err);
  }
});
