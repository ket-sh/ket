export function wireDiffview(): void {
  const diffPanel = document.querySelector<HTMLElement>('.diff-panel');

  if (diffPanel) {
    const formatStore = 'ket-surface-diff-format';

    const showFormat = (wanted: string | null): void => {
      const side = wanted === 'side';

      diffPanel.classList.toggle('is-side', side);

      for (const node of diffPanel.querySelectorAll<HTMLElement>('.diff-format-option')) {
        node.classList.toggle('is-selected', (node.dataset['diffFormat'] === 'side') === side);
      }
    };

    showFormat(localStorage.getItem(formatStore));

    for (const node of diffPanel.querySelectorAll<HTMLElement>('.diff-format-option')) {
      node.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const format = node.dataset['diffFormat'] ?? 'unified';

        localStorage.setItem(formatStore, format);
        showFormat(format);
      });
    }
  }
}
