export type AppView = 'home' | 'assembly' | 'library' | 'setup' | 'laptop' | 'fans';
export type HomeSection = 'proyecto' | 'facultad' | 'equipo' | 'creditos';

export const viewPaths: Record<AppView, string> = {
  home: '/',
  assembly: '/ensamblar-pc',
  laptop: '/ensamblar-laptop',
  setup: '/conectar-estacion',
  library: '/explorar-modelos',
  fans: '/ventiladores-argb-beta',
};

const pathViews: Record<string, AppView> = {
  '/': 'home',
  '/inicio': 'home',
  '/ensamblar-pc': 'assembly',
  '/ensamblar-laptop': 'laptop',
  '/conectar-estacion': 'setup',
  '/explorar-modelos': 'library',
  '/ventiladores-argb-beta': 'fans',
  '/assembly': 'assembly',
  '/laptop': 'laptop',
  '/setup': 'setup',
  '/library': 'library',
  '/fans': 'fans',
};

const homeSections = new Set<HomeSection>(['proyecto', 'facultad', 'equipo', 'creditos']);

export function normalizePath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return normalized.startsWith('/') ? normalized : '/' + normalized;
}

export function resolveNavigation(location: { pathname: string; search?: string }) {
  const pathname = normalizePath(location.pathname);
  const sectionName = pathname.slice(1) as HomeSection;
  if (homeSections.has(sectionName)) return { view: 'home' as const, section: sectionName };
  const requested = new URLSearchParams(location.search ?? '').get('view');
  if (requested && ['assembly', 'library', 'setup', 'laptop', 'fans'].includes(requested)) {
    return { view: requested as AppView };
  }
  const directView = pathViews[pathname];
  if (directView) return { view: directView };
  return { view: 'home' as const };
}

export function sectionPath(section: HomeSection) {
  return '/' + section;
}
