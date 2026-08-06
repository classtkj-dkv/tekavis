import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { isRole } from './_lib/permissions.js';
import { logActivity } from './_lib/activityLog.js';
import { ok, created, forbidden, badRequest, serverError } from './_lib/response.js';

// GET    /api/users        -> daftar user + role (Owner & Admin)
// POST   /api/users        -> body: { email, password, full_name, role_id } bikin akun staff baru (Owner) — mis. Wali Kelas
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

    if (req.method === 'POST') {
      if (!isRole(ctx, 'owner')) return forbidden(res, 'Hanya Owner yang dapat membuat akun baru');
      const { email, password, full_name, role_id } = req.body || {};
      if (!email || !password || !full_name || !role_id) {
        return badRequest(res, 'Email, password, nama, dan jabatan wajib diisi');
      }

      const { data: targetRole } = await admin.from('roles').select('name').eq('id', role_id).single();
      if (targetRole?.name === 'owner') return forbidden(res, 'Tidak bisa membuat akun dengan role Owner lewat sini');
      if (targetRole?.name === 'siswa') {
        return badRequest(res, 'Buat akun siswa lewat halaman Data Siswa, bukan di sini (biar biodatanya lengkap)');
      }

      const { data: authUser, error: authError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authError) return badRequest(res, `Gagal membuat akun: ${authError.message}`);

      const { data, error } = await admin
        .from('profiles')
        .insert({ id: authUser.user.id, role_id, full_name })
        .select('id, full_name, avatar_url, roles(id, name, label)')
        .single();
      if (error) {
        await admin.auth.admin.deleteUser(authUser.user.id);
        throw error;
      }

      await logActivity(req, ctx, { action: 'create_staff_user', targetTable: 'profiles', targetId: data.id, meta: { role_id } });
      return created(res, data);
    }

    if (req.method === 'PATCH') {
      if (!isRole(ctx, 'owner')) return forbidden(res, 'Hanya Owner yang dapat mengubah role user');
      const { user_id, role_id } = req.body || {};
      if (!user_id || !role_id) return badRequest(res, 'user_id dan role_id wajib diisi');

      const { data: target } = await admin.from('profiles').select('id, roles(name)').eq('id', user_id).single();
      if (target?.roles?.name === 'owner') return forbidden(res, 'Role Owner tidak dapat diubah lewat endpoint ini');

      // Sama kayak guard di POST: ganti role jadi "siswa" gak boleh lewat sini,
      // karena cuma update profiles.role_id doang — TANPA bikin baris terhubung
      // di tabel students. Akibatnya siswa "hantu": rolenya siswa tapi gak
      // punya biodata (NISN/jurusan/TTL), field-field itu gak akan pernah
      // muncul di Profil Saya. Wajib lewat halaman Data Siswa biar biodatanya
      // lengkap & otomatis ke-link.
      const { data: newRole } = await admin.from('roles').select('name').eq('id', role_id).single();
      if (newRole?.name === 'siswa') {
        return badRequest(res, 'Ganti ke role Siswa gak bisa lewat sini — biodatanya bakal kosong. Kalau user ini memang siswa, hapus akunnya di sini lalu buat ulang lewat halaman Data Siswa.');
      }

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
