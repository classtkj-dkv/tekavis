import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { ok, badRequest, serverError } from './_lib/response.js';

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
      const { motto, hobby, dream_job, full_name } = req.body || {};
      const patch = {};
      if (motto !== undefined) patch.motto = motto || null;
      if (hobby !== undefined) patch.hobby = hobby || null;
      if (dream_job !== undefined) patch.dream_job = dream_job || null;
      // Nama dikunci buat siswa (dikelola Admin/Owner lewat data siswa) — role lain bebas ganti nama sendiri.
      if (full_name !== undefined && ctx.profile?.roles?.name !== 'siswa') patch.full_name = full_name || null;

      if (Object.keys(patch).length === 0) return badRequest(res, 'Tidak ada field yang diubah');

      const { data, error } = await admin.from('profiles').update(patch).eq('id', ctx.user.id).select().single();
      if (error) throw error;
      return ok(res, data);
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    return serverError(res, err);
  }
});
