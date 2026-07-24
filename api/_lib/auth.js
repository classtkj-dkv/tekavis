import { getSupabaseClient, getSupabaseAdmin } from './supabaseClient.js';
import { unauthorized } from './response.js';

/**
 * Ambil user dari Authorization: Bearer <token> lalu lampirkan
 * req.user (data auth) dan req.profile (row dari tabel profiles,
 * termasuk role_id / role_name) supaya bisa dipakai untuk RBAC.
 *
 * Return null jika tidak ada user yang valid (caller yang menentukan
 * apakah endpoint tsb wajib login atau boleh diakses publik/guest).
 */
export async function getAuthContext(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const supabase = getSupabaseClient(token);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role_id, full_name, avatar_url, hobby, dream_job, occupation, roles ( name, permissions )')
    .eq('id', user.id)
    .single();

  return { token, user, profile, supabase };
}

/**
 * Wrapper untuk endpoint yang WAJIB login.
 * Contoh pakai: export default requireAuth(async (req, res, ctx) => {...})
 */
export function requireAuth(handler) {
  return async (req, res) => {
    const ctx = await getAuthContext(req);
    if (!ctx) return unauthorized(res);
    return handler(req, res, ctx);
  };
}
