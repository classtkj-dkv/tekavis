import { getSupabaseAdmin } from './supabaseClient.js';

/**
 * Catat satu baris activity log. Dipanggil dari endpoint lain setelah
 * aksi penting berhasil (login, tambah siswa, upload foto, dst).
 */
export async function logActivity(req, ctx, { action, targetTable = null, targetId = null, meta = null }) {
  const admin = getSupabaseAdmin();

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;
  const userAgent = req.headers['user-agent'] || null;

  await admin.from('activity_logs').insert({
    user_id: ctx?.user?.id ?? null,
    role_name: ctx?.profile?.roles?.name ?? null,
    action,
    target_table: targetTable,
    target_id: targetId,
    meta,
    ip_address: ip,
    user_agent: userAgent,
  });
}
