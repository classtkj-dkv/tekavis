// Router sederhana berbasis hash, tanpa build step (native ES Modules).
const routes = {}; // path -> async () => renderFn(container, params)

export function registerRoute(path, loader) {
  routes[path] = loader;
}

function matchRoute(hash) {
  const path = hash.replace(/^#/, '') || '/';
  const [pathname] = path.split('?');
  const segments = pathname.split('/').filter(Boolean);

  for (const routePath of Object.keys(routes)) {
    const routeSegments = routePath.split('/').filter(Boolean);
    if (routeSegments.length !== segments.length) continue;

    const params = {};
    const isMatch = routeSegments.every((seg, i) => {
      if (seg.startsWith(':')) {
        params[seg.slice(1)] = segments[i];
        return true;
      }
      return seg === segments[i];
    });

    if (isMatch) return { loader: routes[routePath], params };
  }
  return null;
}

export async function renderCurrentRoute(container) {
  const match = matchRoute(window.location.hash);
  if (!match) {
    container.innerHTML = '<div class="card">Halaman tidak ditemukan.</div>';
    return;
  }
  container.innerHTML = '';
  try {
    const render = await match.loader();
    await render(container, match.params);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="card">Gagal memuat halaman: ${err.message}</div>`;
  }
}

export function navigate(path) {
  window.location.hash = path;
}

// FIX: sebelumnya tiap panggil startRouter() nambah listener 'hashchange' baru
// tanpa pernah dilepas. Karena startRouter() dipanggil ulang tiap kali app
// di-restart (login/register/logout lewat restartApp()), listener-nya numpuk
// terus — tiap ganti hash, semua listener lama ikut jalan nge-render ke
// container versi lama yang udah gak ada di DOM. Sekarang listener cuma
// didaftarkan sekali; container aktif disimpan di variable, di-update tiap
// startRouter() dipanggil ulang.
let hashChangeBound = false;
let activeContainer = null;

export function startRouter(container) {
  activeContainer = container;
  if (!hashChangeBound) {
    hashChangeBound = true;
    window.addEventListener('hashchange', () => renderCurrentRoute(activeContainer));
  }
  renderCurrentRoute(activeContainer);
}
