import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { optionalAuth } from './_lib/auth.js';
import { requirePermission } from './_lib/permissions.js';
import { logActivity } from './_lib/activityLog.js';
import { isPublicResource } from './_lib/visibility.js';
import { ok, created, badRequest, serverError, unauthorized } from './_lib/response.js';

// GET    /api/students          -> daftar siswa (publik, kecuali Owner set privat)
// POST   /api/students          -> tambah siswa (manage_students) — WAJIB email+password,
//                                   otomatis bikin akun login (role siswa) + data biodata terhubung
// PATCH  /api/students?id=...   -> edit siswa (manage_students) — email/password opsional (kosongkan = tidak diubah)
// DELETE /api/students?id=...   -> hapus siswa + akun login terkait (manage_students)
// Tampilan detail siswa dibagi 3 level privasi (server-side, bukan cuma
// disembunyiin di UI): guest (belum login) paling terbatas, pengunjung
// (login tapi bukan siswa/pengurus) menengah, member (siswa/pengurus/admin/
// owner — siapapun yang BUKAN pengunjung) dapet full data.
function maskNisn(nisn) {
  return '•'.repeat(String(nisn).length);
}

function shapeStudentForViewer(s, ctx) {
  const role = ctx?.profile?.roles?.name || null;
  const base = {
    id: s.id,
    name: s.name,
    major: s.major,
    photo_url: s.photo_url,
    profile_id: s.profile_id,
    birth_place: s.birth_place,
  };

  if (!role) {
    // Guest: nama, foto, kota lahir doang, NISN disamarin (bukan disembunyiin total)
    return { ...base, nisn: s.nisn ? maskNisn(s.nisn) : null };
  }
  if (role === 'pengunjung') {
    // Login tapi cuma pengunjung umum (daftar sendiri lewat web): NISN & tanggal
    // lahir persis disembunyiin total, tapi jurusan/hobi/cita-cita boleh keliatan
    return { ...base, profiles: s.profiles };
  }
  // Siswa terdaftar, pengurus struktur, admin (wali kelas), owner -> full
  return { ...base, birth_date: s.birth_date, nisn: s.nisn, profiles: s.profiles };
}

export default optionalAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      if (!ctx.profile && !(await isPublicResource(admin, 'students'))) {
        return unauthorized(res, 'Data siswa hanya untuk anggota yang login');
      }
      const { data, error } = await admin
        .from('students')
        .select('*, profiles(motto, hobby, dream_job)')
        .order('name', { ascending: true });
      if (error) throw error;
      return ok(res, data.map(s => shapeStudentForViewer(s, ctx)));
    }

    if (req.method === 'POST') {
      requirePermission(ctx, 'manage_students');
      const { email, password, name, birth_place, birth_date, major, nisn } = req.body || {};
      if (!name) {
        return badRequest(res, 'Nama wajib diisi');
      }
      if (!email || !password) {
        return badRequest(res, 'Gmail dan password wajib diisi untuk membuat akun siswa');
      }

      const { data: siswaRole } = await admin.from('roles').select('id').eq('name', 'siswa').single();

      const { data: authUser, error: authError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authError) return badRequest(res, `Gagal membuat akun: ${authError.message}`);

      const { error: profileError } = await admin
        .from('profiles')
        .insert({ id: authUser.user.id, role_id: siswaRole?.id || null, full_name: name });
      if (profileError) {
        await admin.auth.admin.deleteUser(authUser.user.id);
        throw profileError;
      }

      const { data, error } = await admin
        .from('students')
        .insert({
          profile_id: authUser.user.id,
          name,
          birth_place: birth_place || null,
          birth_date: birth_date || null,
          major: major || null,
          nisn: nisn || null,
        })
        .select()
        .single();
      if (error) {
        await admin.auth.admin.deleteUser(authUser.user.id); // cascade hapus profiles juga
        throw error;
      }

      await logActivity(req, ctx, { action: 'create_student', targetTable: 'students', targetId: data.id });
      return created(res, data);
    }

    if (req.method === 'PATCH') {
      requirePermission(ctx, 'manage_students');
      if (!id) return badRequest(res, 'Parameter id wajib diisi');

      const { email, password, ...rest } = req.body || {};
      const allowed = ['name', 'birth_place', 'birth_date', 'major', 'nisn'];
      const patch = Object.fromEntries(Object.entries(rest).filter(([k]) => allowed.includes(k)));
      ['birth_place', 'birth_date', 'major', 'nisn'].forEach(key => {
        if (patch[key] === '') patch[key] = null;
      });

      const { data: existing } = await admin.from('students').select('profile_id').eq('id', id).maybeSingle();

      if ((email || password) && existing?.profile_id) {
        const authPatch = {};
        if (email) authPatch.email = email;
        if (password) authPatch.password = password;
        const { error: authError } = await admin.auth.admin.updateUserById(existing.profile_id, authPatch);
        if (authError) return badRequest(res, `Gagal update akun: ${authError.message}`);
      }

      if (patch.name) {
        await admin.from('profiles').update({ full_name: patch.name }).eq('id', existing?.profile_id || '');
      }

      const { data, error } = await admin.from('students').update(patch).eq('id', id).select().single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'update_student', targetTable: 'students', targetId: id });
      return ok(res, data);
    }

    if (req.method === 'DELETE') {
      requirePermission(ctx, 'manage_students');
      if (!id) return badRequest(res, 'Parameter id wajib diisi');

      const { data: existing } = await admin.from('students').select('profile_id').eq('id', id).maybeSingle();
      if (existing?.profile_id) {
        await admin.auth.admin.deleteUser(existing.profile_id).catch(() => {});
      }

      const { error } = await admin.from('students').delete().eq('id', id);
      if (error) throw error;
      await logActivity(req, ctx, { action: 'delete_student', targetTable: 'students', targetId: id });
      return ok(res, { deleted: true });
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, error: err.message });
    return serverError(res, err);
  }
});
