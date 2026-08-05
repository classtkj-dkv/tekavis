import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { uploadImage } from './_lib/cloudinary.js';
import { ok, created, badRequest, forbidden, serverError } from './_lib/response.js';

// GET   /api/auth  -> profil + role + permission user yang sedang login
//                     (kalau role 'siswa', ikut disertakan data siswa terkait: nama, NISN, jurusan, dll)
// POST  /api/auth  -> dipanggil sekali setelah signUp Supabase dari halaman publik /register.
//                     Akun yang daftar sendiri lewat web SELALU dapat role 'pengunjung', BUKAN 'siswa' —
//                     siswa resmi cuma bisa dibuat Owner/Admin lewat halaman Kelola Siswa (lihat api/students.js).
// PATCH /api/auth  -> user mengubah data profilnya sendiri (moto, hobi, cita-cita — field bebas).
//                     Nama tidak bisa diubah lewat sini kalau rolenya 'siswa' (nama dikunci, dikelola Admin/Owner).
export default requireAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      let student = null;
      if (ctx.profile?.roles?.name === 'siswa') {
        const { data } = await admin.from('students').select('*').eq('profile_id', ctx.user.id).maybeSingle();
        student = data || null;
      }
      return ok(res, {
        id: ctx.user.id,
        email: ctx.user.email,
        profile: ctx.profile,
        student,
        role: ctx.profile?.roles?.name || null,
        permissions: ctx.profile?.roles?.permissions || {},
      });
    }

    if (req.method === 'POST' && req.query.action === 'upload-photo') {
      const { file } = req.body || {};
      if (!file) return badRequest(res, 'File wajib diisi');

      const result = await uploadImage(file, { folder: 'kelas-cms/profile' });

      if (ctx.profile?.roles?.name === 'siswa') {
        await admin.from('students').update({ photo_url: result.url }).eq('profile_id', ctx.user.id);
      }
      await admin.from('profiles').update({ avatar_url: result.url }).eq('id', ctx.user.id);

      return created(res, { url: result.url });
    }

    if (req.method === 'POST') {
      const { data: existing } = await admin.from('profiles').select('id').eq('id', ctx.user.id).maybeSingle();
      if (existing) return ok(res, { message: 'Profil sudah ada' });

      // Siapa pun yang daftar sendiri lewat /register dianggap "pengunjung"
      // (bukan siswa kelas ini) — cuma bisa lihat konten publik. Siswa resmi
      // wajib dibuatkan akunnya oleh Owner/Admin lewat halaman Kelola Siswa.
      const { data: pengunjungRole } = await admin.from('roles').select('id').eq('name', 'pengunjung').single();
      const { full_name } = req.body || {};

      const { data, error } = await admin
        .from('profiles')
        .insert({ id: ctx.user.id, role_id: pengunjungRole?.id || null, full_name: full_name || ctx.user.email })
        .select()
        .single();
      if (error) throw error;
      return ok(res, data);
    }

    if (req.method === 'PATCH') {
      const { motto, hobby, dream_job, full_name, nisn, birth_date, birth_place, major } = req.body || {};
      const patch = {};
      if (motto !== undefined) patch.motto = motto || null;
      if (hobby !== undefined) patch.hobby = hobby || null;
      if (dream_job !== undefined) patch.dream_job = dream_job || null;
      // Nama dikunci buat siswa (dikelola Admin/Owner lewat data siswa) — role lain bebas ganti nama sendiri.
      if (full_name !== undefined && ctx.profile?.roles?.name !== 'siswa') patch.full_name = full_name || null;

      // Field data siswa (NISN/TTL/Jurusan) — sengaja dicek ulang di server
      // (bukan cuma disembunyikan di frontend), Owner yang atur per-role lewat
      // permission self_edit_nisn/self_edit_birth/self_edit_major. Cuma
      // berlaku buat role 'siswa' karena field ini emang cuma ada di situ.
      const perms = ctx.profile?.roles?.permissions || {};
      const isSiswa = ctx.profile?.roles?.name === 'siswa';
      const studentPatch = {};
      if (nisn !== undefined) {
        if (!isSiswa || !perms.self_edit_nisn) return forbidden(res, 'Tidak memiliki izin mengubah NISN sendiri');
        studentPatch.nisn = nisn || null;
      }
      if ((birth_date !== undefined || birth_place !== undefined)) {
        if (!isSiswa || !perms.self_edit_birth) return forbidden(res, 'Tidak memiliki izin mengubah tempat/tanggal lahir sendiri');
        if (birth_date !== undefined) studentPatch.birth_date = birth_date || null;
        if (birth_place !== undefined) studentPatch.birth_place = birth_place || null;
      }
      if (major !== undefined) {
        if (!isSiswa || !perms.self_edit_major) return forbidden(res, 'Tidak memiliki izin mengubah jurusan sendiri');
        studentPatch.major = major || null;
      }
      if (Object.keys(studentPatch).length) {
        const { error: studentErr } = await admin.from('students').update(studentPatch).eq('profile_id', ctx.user.id);
        if (studentErr) throw studentErr;
      }

      if (Object.keys(patch).length === 0 && Object.keys(studentPatch).length === 0) return badRequest(res, 'Tidak ada field yang diubah');
      if (Object.keys(patch).length === 0) return ok(res, { updated: true });

      const { data, error } = await admin.from('profiles').update(patch).eq('id', ctx.user.id).select().single();
      if (error) throw error;
      return ok(res, data);
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    return serverError(res, err);
  }
});
