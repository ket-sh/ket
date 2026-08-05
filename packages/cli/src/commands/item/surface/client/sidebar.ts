import { settleGrid } from './bricks.ts';

const NAV_STORE = 'ket-surface-nav';

function showNav(navToggle: HTMLElement, open: boolean): void {
  document.body.classList.toggle('is-nav-collapsed', !open);
  navToggle.setAttribute('aria-expanded', String(open));
  requestAnimationFrame(settleGrid);
}

function settleAfterSlide(event: TransitionEvent): void {
  if (event.target === document.body && event.propertyName === 'grid-template-columns') {
    settleGrid();
  }
}

export function wireSidebar(): void {
  const navToggle = document.querySelector<HTMLElement>('.nav-toggle');

  if (navToggle === null) {
    return;
  }

  document.body.addEventListener('transitionend', settleAfterSlide);
  showNav(navToggle, localStorage.getItem(NAV_STORE) !== 'collapsed');

  navToggle.addEventListener('click', () => {
    const open = document.body.classList.contains('is-nav-collapsed');

    localStorage.setItem(NAV_STORE, open ? 'expanded' : 'collapsed');
    showNav(navToggle, open);
  });
}
