import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { uploadImage } from './_lib/cloudinary.js';
import { ok, created, badRequest, forbidden, serverError } from './_lib/response.js';

// GET   /api/auth  -> profil + role + permission user yang sedang login.
//                     Data siswa (nama/NISN/jurusan/dll) disertakan kalau akunnya
//                     ke-link ke tabel students — TERLEPAS dari nama role-nya,
//                     karena siswa yang pegang jabatan (Ketua/Bendahara/dst)
//                     tetap punya data siswa yang sama.
// POST  /api/auth  -> dipanggil sekali setelah signUp Supabase dari halaman publik /register.
//                     Akun yang daftar sendiri lewat web SELALU dapat role 'pengunjung', BUKAN 'siswa' —
//                     siswa resmi cuma bisa dibuat Owner/Admin lewat halaman Kelola Siswa (lihat api/students.js).
// PATCH /api/auth  -> user mengubah data profilnya sendiri (moto, hobi, cita-cita — field bebas,
//                     plus NISN/TTL/jurusan kalau punya data siswa ke-link & diizinkan Owner).
export default requireAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      const { data: student } = await admin.from('students').select('*').eq('profile_id', ctx.user.id).maybeSingle();
      return ok(res, {
        id: ctx.user.id,
        email: ctx.user.email,
        profile: ctx.profile,
        student: student || null,
        role: ctx.profile?.roles?.name || null,
        permissions: ctx.profile?.roles?.permissions || {},
      });
    }

    if (req.method === 'POST' && req.query.action === 'upload-photo') {
      const { file } = req.body || {};
      if (!file) return badRequest(res, 'File wajib diisi');

      const result = await uploadImage(file, { folder: 'kelas-cms/profile' });

      // Update profiles.avatar_url selalu; students.photo_url ikut ke-update
      // kalau memang ada baris siswa yang ke-link (no-op aman kalau enggak).
      await admin.from('students').update({ photo_url: result.url }).eq('profile_id', ctx.user.id);
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

      // Data siswa ke-link atau enggak dicek dari TABEL STUDENTS langsung
      // (bukan dari nama role) — siswa yang pegang jabatan (Ketua/Bendahara/
      // dst) tetap punya baris students yang sama, cuma role sistemnya beda.
      const { data: linkedStudent } = await admin.from('students').select('id').eq('profile_id', ctx.user.id).maybeSingle();
      const hasStudentData = Boolean(linkedStudent);

      const patch = {};
      if (motto !== undefined) patch.motto = motto || null;
      if (hobby !== undefined) patch.hobby = hobby || null;
      if (dream_job !== undefined) patch.dream_job = dream_job || null;
      // Nama dikunci buat siapapun yang punya data siswa ke-link (dikelola Admin/Owner lewat data siswa).
      if (full_name !== undefined && !hasStudentData) patch.full_name = full_name || null;

      // Field data siswa (NISN/TTL/Jurusan) — sengaja dicek ulang di server
      // (bukan cuma disembunyikan di frontend). Owner atur izinnya lewat
      // permission self_edit_nisn/self_edit_birth/self_edit_major, yang
      // sekarang otomatis diwarisi role manapun yang berbasis siswa
      // (termasuk yang pegang jabatan) lewat _lib/auth.js.
      const perms = ctx.profile?.roles?.permissions || {};
      const studentPatch = {};
      if (nisn !== undefined) {
        if (!hasStudentData || !perms.self_edit_nisn) return forbidden(res, 'Tidak memiliki izin mengubah NISN sendiri');
        studentPatch.nisn = nisn || null;
      }
      if ((birth_date !== undefined || birth_place !== undefined)) {
        if (!hasStudentData || !perms.self_edit_birth) return forbidden(res, 'Tidak memiliki izin mengubah tempat/tanggal lahir sendiri');
        if (birth_date !== undefined) studentPatch.birth_date = birth_date || null;
        if (birth_place !== undefined) studentPatch.birth_place = birth_place || null;
      }
      if (major !== undefined) {
        if (!hasStudentData || !perms.self_edit_major) return forbidden(res, 'Tidak memiliki izin mengubah jurusan sendiri');
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
