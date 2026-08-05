export function wireTheme(): void {
  const themeSwitch = document.querySelector<HTMLElement>('.theme-switch');

  if (themeSwitch) {
    const paint = () => {
      for (const node of themeSwitch.querySelectorAll<HTMLElement>('.theme-option')) {
        node.classList.toggle('is-selected', node.dataset['theme'] === ketSurfaceTheme.chosen());
      }
    };

    for (const node of themeSwitch.querySelectorAll<HTMLElement>('.theme-option')) {
      node.addEventListener('click', () => {
        ketSurfaceTheme.choose(node.dataset['theme'] ?? 'system');
      });
    }

    document.addEventListener('ket-surface-scheme', paint);
    paint();
  }
}
