import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { ok, badRequest, serverError } from './_lib/response.js';

// GET  /api/auth  -> profil + role + permission user yang sedang login
// POST /api/auth  -> dipanggil sekali setelah signUp Supabase, membuat row di `profiles` (role default: siswa)
export default requireAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();

  try {
    if (req.method === 'GET') {
      return ok(res, {
        id: ctx.user.id,
        email: ctx.user.email,
        profile: ctx.profile,
        role: ctx.profile?.roles?.name || null,
        permissions: ctx.profile?.roles?.permissions || {},
      });
    }

    if (req.method === 'POST') {
      const { data: existing } = await admin.from('profiles').select('id').eq('id', ctx.user.id).maybeSingle();
      if (existing) return ok(res, { message: 'Profil sudah ada' });

      const { data: siswaRole } = await admin.from('roles').select('id').eq('name', 'siswa').single();
      const { full_name } = req.body || {};

      const { data, error } = await admin
        .from('profiles')
        .insert({ id: ctx.user.id, role_id: siswaRole?.id || null, full_name: full_name || ctx.user.email })
        .select()
        .single();
      if (error) throw error;
      return ok(res, data);
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    return serverError(res, err);
  }
});
