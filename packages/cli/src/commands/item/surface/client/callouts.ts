const CALLOUT_STORE = 'ket-surface-callouts';

function showCallouts(
  home: HTMLElement,
  switches: Iterable<HTMLElement>,
  state: 'on' | 'off',
): void {
  home.classList.toggle('callouts-off', state === 'off');

  for (const node of switches) {
    node.setAttribute('aria-pressed', String(state === 'on'));
    node.textContent = state === 'on' ? 'Callouts on' : 'Callouts off';
  }
}

function wireSwitches(home: HTMLElement, switches: Iterable<HTMLElement>): void {
  for (const node of switches) {
    node.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const state = home.classList.contains('callouts-off') ? 'on' : 'off';

      localStorage.setItem(CALLOUT_STORE, state);
      showCallouts(home, switches, state);
    });
  }
}

function shapesOf(home: HTMLElement, shape: string | undefined): Iterable<HTMLElement> {
  return home.querySelectorAll<HTMLElement>(`[data-callout-shape="${String(shape)}"]`);
}

function lightUp(home: HTMLElement, shape: string | undefined): void {
  for (const node of shapesOf(home, shape)) {
    node.classList.add('is-lit');
  }
}

function lightDown(home: HTMLElement, shape: string | undefined): void {
  for (const node of shapesOf(home, shape)) {
    node.classList.remove('is-lit');
  }
}

function wireLighting(home: HTMLElement): void {
  for (const node of home.querySelectorAll<HTMLElement>('[data-callout-shape]')) {
    const shape = node.dataset['calloutShape'];

    node.addEventListener('mouseenter', () => {
      lightUp(home, shape);
    });
    node.addEventListener('mouseleave', () => {
      lightDown(home, shape);
    });
    node.addEventListener('focus', () => {
      lightUp(home, shape);
    });
    node.addEventListener('blur', () => {
      lightDown(home, shape);
    });
  }
}

export function wireCallouts(): void {
  const home = document.getElementById('section-design');

  if (home === null) {
    return;
  }

  const switches = home.querySelectorAll<HTMLElement>('.callout-switch');

  showCallouts(home, switches, localStorage.getItem(CALLOUT_STORE) === 'off' ? 'off' : 'on');
  wireSwitches(home, switches);
  wireLighting(home);
}
