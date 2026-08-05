import { scriptSafeJson } from './text.ts';

export const themeScript = `<script>
  const themeStore = 'ket-surface-theme';
  const themeNames = ['system', 'dark', 'light'];
  const root = document.documentElement;
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');

  const resolve = () => {
    const chosen = root.dataset.theme;
    const scheme = chosen === 'system' ? (darkQuery.matches ? 'dark' : 'light') : chosen;

    root.dataset.scheme = scheme;
    document.dispatchEvent(new CustomEvent('ket-surface-scheme'));
  };

  window.ketSurfaceTheme = {
    chosen: () => root.dataset.theme,
    choose: (wanted) => {
      const next = themeNames.includes(wanted) ? wanted : 'system';

      localStorage.setItem(themeStore, next);
      root.dataset.theme = next;
      resolve();
    },
  };

  const stored = localStorage.getItem(themeStore);

  root.dataset.theme = themeNames.includes(stored) ? stored : 'system';
  resolve();
  darkQuery.addEventListener('change', resolve);
</script>`;

export const themeSwitch = `<div class="theme-switch" role="group" aria-label="Theme">
  <button type="button" class="theme-option" data-theme="system">System</button>
  <button type="button" class="theme-option" data-theme="dark">Dark</button>
  <button type="button" class="theme-option" data-theme="light">Light</button>
</div>`;

export const sidebarGlyph = `<svg class="nav-toggle-icon" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false"><path class="nav-toggle-rail" d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4z"/><rect class="nav-toggle-frame" x="3" y="3" width="18" height="18" rx="2.5"/><path class="nav-toggle-spine" d="M9 3.75v16.5"/></svg>`;

export function surfaceBootstrap(
  key: string,
  itemKey: string,
  selected: string,
  routes: Record<string, { section: string; feature: string }>,
  firstChild: Record<string, string>,
): string {
  const carried = scriptSafeJson({
    live: `/ws?key=${key}`,
    itemKey,
    selected,
    routes,
    firstChild,
  });

  return `<script>window.ketSurface = ${carried};</script>\n<script type="module" src="/surface.js?key=${key}"></script>`;
}
