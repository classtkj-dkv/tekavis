export function ok(res, data, meta = undefined) {
  return res.status(200).json({ success: true, data, meta });
}

export function created(res, data) {
  return res.status(201).json({ success: true, data });
}

export function fail(res, status, message, details = undefined) {
  return res.status(status).json({ success: false, error: message, details });
}

export function badRequest(res, message = 'Permintaan tidak valid', details) {
  return fail(res, 400, message, details);
}

export function unauthorized(res, message = 'Anda belum login') {
  return fail(res, 401, message);
}

export function forbidden(res, message = 'Anda tidak memiliki izin untuk aksi ini') {
  return fail(res, 403, message);
}

export function notFound(res, message = 'Data tidak ditemukan') {
  return fail(res, 404, message);
}

export function serverError(res, err) {
  console.error(err);
  return fail(res, 500, 'Terjadi kesalahan pada server');
}
