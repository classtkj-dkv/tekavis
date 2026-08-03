import { getSupabaseClient } from './supabaseClient.js';
import { isRole } from './permissions.js';

/**
 * Verifikasi ulang identitas Owner sebelum aksi destruktif (clear/hapus
 * massal data absensi & kas). Dua syarat: (1) rolenya emang owner, (2)
 * password yang dikirim dicocokkan LANGSUNG ke Supabase Auth lewat
 * signInWithPassword — bukan disimpan/dibandingkan manual di kode kita.
 * Sesi hasil signIn ini gak disimpan (persistSession:false di client-nya),
 * cuma dipakai sesaat buat ngetes valid/enggaknya password lalu dibuang.
 */
export async function verifyOwnerPassword(ctx, password) {
  if (!isRole(ctx, 'owner')) {
    return { ok: false, status: 403, message: 'Hanya Owner yang dapat melakukan aksi ini' };
  }
  if (!password) {
    return { ok: false, status: 400, message: 'Password wajib diisi untuk konfirmasi' };
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email: ctx.user.email, password });
  if (error) {
    return { ok: false, status: 401, message: 'Password salah' };
  }
  return { ok: true };
}
