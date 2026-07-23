import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { isRole } from './_lib/permissions.js';
import { ok, forbidden, serverError } from './_lib/response.js';

// GET /api/activity-log?page=&limit=  -> hanya Owner & Admin
export default requireAuth(async (req, res, ctx) => {
  if (!isRole(ctx, 'owner', 'admin')) return forbidden(res, 'Hanya Owner/Admin yang dapat melihat activity log');
  try {
    const admin = getSupabaseAdmin();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 30);
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await admin
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return ok(res, data, { page, limit, total: count });
  } catch (err) {
    return serverError(res, err);
  }
});
