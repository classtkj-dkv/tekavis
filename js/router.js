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

export function startRouter(container) {
  window.addEventListener('hashchange', () => renderCurrentRoute(container));
  renderCurrentRoute(container);
}
