import { getSupabaseAdmin } from './_lib/supabaseClient.js';
import { requireAuth } from './_lib/auth.js';
import { requirePermission } from './_lib/permissions.js';
import { logActivity } from './_lib/activityLog.js';
import { ok, created, forbidden, badRequest, serverError } from './_lib/response.js';

// GET    /api/finance          -> ringkasan saldo + daftar transaksi (view_kas)
// POST   /api/finance          -> tambah transaksi (manage_finance)
// PATCH  /api/finance?id=...   -> edit transaksi (manage_finance)
// DELETE /api/finance?id=...   -> hapus transaksi (manage_finance)
export default requireAuth(async (req, res, ctx) => {
  const admin = getSupabaseAdmin();
  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      if (!ctx.profile?.roles?.permissions?.view_kas && ctx.profile?.roles?.name !== 'owner') {
        return forbidden(res, 'Anda tidak memiliki izin melihat kas');
      }
      const { data: transactions, error } = await admin
        .from('finance_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      return ok(res, { transactions, summary: { income, expense, balance: income - expense } });
    }

    if (req.method === 'POST') {
      requirePermission(ctx, 'manage_finance');
      const { type, amount, category, description, transaction_date, proof_url } = req.body || {};
      if (!type || !amount) return badRequest(res, 'Jenis dan nominal transaksi wajib diisi');
      const { data, error } = await admin
        .from('finance_transactions')
        .insert({
          type, amount, category, description,
          transaction_date: transaction_date || new Date().toISOString().slice(0, 10),
          proof_url,
          created_by: ctx.profile.id,
          updated_by: ctx.profile.id,
        })
        .select()
        .single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'create_transaction', targetTable: 'finance_transactions', targetId: data.id });
      return created(res, data);
    }

    if (req.method === 'PATCH') {
      requirePermission(ctx, 'manage_finance');
      if (!id) return badRequest(res, 'Parameter id wajib diisi');
      const patch = { ...(req.body || {}), updated_by: ctx.profile.id };
      const { data, error } = await admin.from('finance_transactions').update(patch).eq('id', id).select().single();
      if (error) throw error;
      await logActivity(req, ctx, { action: 'update_transaction', targetTable: 'finance_transactions', targetId: id });
      return ok(res, data);
    }

    if (req.method === 'DELETE') {
      requirePermission(ctx, 'manage_finance');
      if (!id) return badRequest(res, 'Parameter id wajib diisi');
      const { error } = await admin.from('finance_transactions').delete().eq('id', id);
      if (error) throw error;
      await logActivity(req, ctx, { action: 'delete_transaction', targetTable: 'finance_transactions', targetId: id });
      return ok(res, { deleted: true });
    }

    return badRequest(res, `Method ${req.method} tidak didukung`);
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, error: err.message });
    return serverError(res, err);
  }
});
