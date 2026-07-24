import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { isRole } from './_lib/permissions.js';
import { logActivity } from './_lib/activityLog.js';
import { ok, created, forbidden, badRequest, serverError } from './_lib/response.js';

// GET    /api/roles          -> daftar role (Owner & Admin)
// POST   /api/roles          -> tambah role/jabatan baru (Owner)
// PATCH  /api/roles?id=...   -> ubah label/permissions (Owner)
// DELETE /api/roles?id=...   -> hapus role non-sistem yang tidak dipakai user (Owner)
export default requireAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      if (!isRole(ctx, 'owner', 'admin')) return forbidden(res);
      const { data, error } = await admin.from('roles').select('*').order('is_system', { ascending: false }).order('label');
      if (error) throw error;
      return ok(res, data);
    }

    if (req.method === 'POST') {
      if (!isRole(ctx, 'owner')) return forbidden(res, 'Hanya Owner yang dapat menambah role');
      const { name, label, permissions } = req.body || {};
      if (!name || !label) return badRequest(res, 'Kode role (name) dan label wajib diisi');
      const { data, error } = await admin
        .from('roles')
        .insert({ name: String(name).toLowerCase().trim().replace(/\s+/g, '_'), label, permissions: permissions || {}, is_system: false })
        .select()
        .single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'create_role', targetTable: 'roles', targetId: data.id });
      return created(res, data);
    }

    if (!isRole(ctx, 'owner')) return forbidden(res, 'Hanya Owner yang dapat mengelola role');
    if (!id) return badRequest(res, 'Parameter id wajib diisi');

    const { data: role } = await admin.from('roles').select('*').eq('id', id).single();
    if (!role) return badRequest(res, 'Role tidak ditemukan');

    if (req.method === 'PATCH') {
      if (role.name === 'owner') return forbidden(res, 'Permission Owner tidak dapat diubah');
      const { label, permissions } = req.body || {};
      const patch = {};
      if (label !== undefined) patch.label = label;
      if (permissions !== undefined) patch.permissions = permissions;
      const { data, error } = await admin.from('roles').update(patch).eq('id', id).select().single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'update_role', targetTable: 'roles', targetId: id, meta: patch });
      return ok(res, data);
    }

    if (req.method === 'DELETE') {
      if (role.is_system) return forbidden(res, 'Role sistem tidak dapat dihapus');
      const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role_id', id);
      if (count > 0) return forbidden(res, `Role ini masih dipakai ${count} user, pindahkan dulu sebelum menghapus`);
      const { error } = await admin.from('roles').delete().eq('id', id);
      if (error) throw error;
      await logActivity(req, ctx, { action: 'delete_role', targetTable: 'roles', targetId: id });
      return ok(res, { deleted: true });
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    return serverError(res, err);
  }
});
