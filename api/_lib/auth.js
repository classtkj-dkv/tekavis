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

  // Role "jabatan" (Ketua/Wakil/Sekretaris/Bendahara/Keamanan/Kebersihan,
  // atau role kustom lain yang Owner buat di Role & Permission) itu isinya
  // anggota kelas biasa yang KEBETULAN pegang jabatan — bukan tingkatan role
  // baru yang menggantikan status siswa mereka. Jadi permission-nya
  // DIGABUNG: base permission Siswa + tambahan permission jabatannya
  // (permission jabatan menang kalau ada yang bentrok). Ini yang bikin
  // orang yang jadi Bendahara/Ketua/dll tetap bisa pakai semua hak siswa
  // biasa (ganti email/password sendiri, dst — kalau memang diizinkan buat
  // Siswa) SEKALIGUS dapet tambahan izin dari jabatannya.
  const roleName = profile?.roles?.name;
  const isPositionRole = roleName && !['owner', 'admin', 'siswa', 'pengunjung'].includes(roleName);
  if (isPositionRole) {
    const { data: siswaRole } = await admin.from('roles').select('permissions').eq('name', 'siswa').maybeSingle();
    if (siswaRole?.permissions) {
      profile.roles.permissions = { ...siswaRole.permissions, ...(profile.roles.permissions || {}) };
    }
  }

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

/**
 * Wrapper untuk endpoint yang BOLEH diakses tanpa login (mis. GET publik),
 * tapi tetap butuh tau siapa yang login (kalau ada) buat cek permission pas
 * mutasi (POST/PATCH/DELETE). ctx.profile bakal null kalau belum login —
 * setiap pemanggilan requirePermission/isRole udah aman nerima itu.
 */
export function optionalAuth(handler) {
  return async (req, res) => {
    const ctx = (await getAuthContext(req)) || { token: null, user: null, profile: null };
    return handler(req, res, ctx);
  };
}
