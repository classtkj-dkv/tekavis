import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { isRole } from './_lib/permissions.js';
import { logActivity } from './_lib/activityLog.js';
import { ok, forbidden, badRequest, serverError } from './_lib/response.js';

// GET   /api/users        -> daftar user + role (Owner & Admin)
// PATCH /api/users        -> body: { user_id, role_id } ganti role (Owner)
// GET    /api/users        -> daftar user + role (Owner & Admin)
// PATCH  /api/users        -> body: { user_id, role_id } ganti role (Owner)
// DELETE /api/users?id=... -> hapus user (Owner). Kalau user ini juga siswa
//                             berakun, data siswanya (nama/foto/dll) TETAP ada,
//                             cuma akun login-nya yang kehapus.
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

    if (req.method === 'DELETE') {
      if (!isRole(ctx, 'owner')) return forbidden(res, 'Hanya Owner yang dapat menghapus user');
      const { id } = req.query;
      if (!id) return badRequest(res, 'Parameter id wajib diisi');
      if (id === ctx.user.id) return forbidden(res, 'Tidak bisa menghapus akun sendiri');

      const { data: target } = await admin.from('profiles').select('id, roles(name)').eq('id', id).single();
      if (target?.roles?.name === 'owner') return forbidden(res, 'Akun Owner tidak dapat dihapus');

      const { error } = await admin.auth.admin.deleteUser(id); // cascade hapus row profiles juga
      if (error) throw error;
      await logActivity(req, ctx, { action: 'delete_user', targetTable: 'profiles', targetId: id });
      return ok(res, { deleted: true });
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    return serverError(res, err);
  }
});
