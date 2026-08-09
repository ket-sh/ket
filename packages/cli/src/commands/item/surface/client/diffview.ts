function showFormat(diffPanel: HTMLElement, wanted: string | null): void {
  const side = wanted === 'side';

  diffPanel.classList.toggle('is-side', side);

  for (const node of diffPanel.querySelectorAll<HTMLElement>('.diff-format-option')) {
    node.classList.toggle('is-selected', (node.dataset['diffFormat'] === 'side') === side);
  }
}

function wireFormat(diffPanel: HTMLElement): void {
  const formatStore = 'ket-surface-diff-format';

  showFormat(diffPanel, localStorage.getItem(formatStore));

  for (const node of diffPanel.querySelectorAll<HTMLElement>('.diff-format-option')) {
    node.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const format = node.dataset['diffFormat'] ?? 'unified';

      localStorage.setItem(formatStore, format);
      showFormat(diffPanel, format);
    });
  }
}

function showFile(diffPanel: HTMLElement, target: string): void {
  for (const node of diffPanel.querySelectorAll<HTMLElement>('.diff-tree-item')) {
    node.classList.toggle('is-selected', node.dataset['diffTarget'] === target);
  }

  for (const node of diffPanel.querySelectorAll<HTMLElement>('.diff-file')) {
    node.classList.toggle('is-shown', node.id === target);
  }
}

function wireTree(diffPanel: HTMLElement): void {
  for (const node of diffPanel.querySelectorAll<HTMLElement>('.diff-tree-item')) {
    node.addEventListener('click', () => {
      const target = node.dataset['diffTarget'];

      if (target !== undefined) {
        showFile(diffPanel, target);
      }
    });
  }
}

export function wireDiffview(): void {
  const diffPanel = document.querySelector<HTMLElement>('.diff-panel');

  if (diffPanel) {
    wireFormat(diffPanel);
    wireTree(diffPanel);
  }
}
