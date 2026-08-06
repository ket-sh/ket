import { ketSurface } from './carried.ts';

interface Shown {
  target: string;
  route: string | undefined;
  feature: string | undefined;
}

function childOf(route: string): { section: string; feature: string } | undefined {
  return Object.hasOwn(ketSurface.routes, route) ? ketSurface.routes[route] : undefined;
}

function featureOf(route: string | undefined): string | undefined {
  return route === undefined ? undefined : childOf(route)?.feature;
}

function resolveShown(wanted: string): Shown {
  const asked = childOf(wanted);

  if (asked !== undefined) {
    return { target: asked.section, route: wanted, feature: asked.feature };
  }

  const target =
    document.getElementById(`section-${wanted}`) === null ? ketSurface.selected : wanted;
  const route = ketSurface.firstChild[target];

  return { target, route, feature: featureOf(route) };
}

function paint(selector: string, marker: string, field: string, value: string | undefined): void {
  for (const node of document.querySelectorAll<HTMLElement>(selector)) {
    node.classList.toggle(marker, value !== undefined && node.dataset[field] === value);
  }
}

function show(wanted: string): void {
  const shown = resolveShown(wanted);

  paint('.section', 'is-active', 'section', shown.target);
  paint('.nav-item', 'is-selected', 'section', shown.target);
  paint('.nav-child', 'is-selected', 'route', shown.route);
  paint('.feature-card', 'is-active', 'feature', shown.feature);
  document.dispatchEvent(new CustomEvent('ket-surface-shown'));
}

function settleJump(target: HTMLDetailsElement, surface: Element): void {
  requestAnimationFrame(() => {
    const pinned = surface.querySelector<HTMLElement>('.diff-index');
    const covered = pinned === null ? 0 : pinned.getBoundingClientRect().height;

    surface.scrollTop +=
      target.getBoundingClientRect().top - surface.getBoundingClientRect().top - covered;
  });
}

function jumpTo(target: HTMLDetailsElement): void {
  for (const other of document.querySelectorAll<HTMLElement>('.diff-file.is-jumped')) {
    other.classList.remove('is-jumped');
  }

  target.open = true;
  target.classList.add('is-jumped');

  const surface = target.closest('.panel-body');

  if (surface !== null) {
    settleJump(target, surface);
  }
}

function wireDiffJump(): void {
  for (const target of document.querySelectorAll<HTMLDetailsElement>('details.diff-file')) {
    const opener = document.querySelector<HTMLElement>(`[data-diff-target="${target.id}"]`);

    if (opener !== null) {
      opener.addEventListener('click', () => {
        jumpTo(target);
      });
    }
  }
}

export function wireNav(): void {
  show(location.hash.slice(1));
  addEventListener('hashchange', () => {
    show(location.hash.slice(1));
  });
  wireDiffJump();
}
