export const surfaceStyle = `
:root {
  --color-paper: oklch(0.98 0.01 75);
  --color-scrim: oklch(0.18 0.01 75);
  --color-glow: oklch(0.9 0.08 75);
  --color-canvas: oklch(0.68 0.15 40);
  --radius-panel: 0.75rem;
  --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
}
[data-scheme='dark'] {
  --surface: oklch(0.16 0.01 75);
  --surface-raised: oklch(0.21 0.01 75);
  --ink: var(--color-paper);
  --ink-muted: oklch(0.72 0.01 75);
  --edge: oklch(0.32 0.01 75);
  --code-ink: var(--color-glow);
}
[data-scheme='light'] {
  --surface: var(--color-paper);
  --surface-raised: oklch(1 0 0);
  --ink: var(--color-scrim);
  --ink-muted: oklch(0.45 0.01 75);
  --edge: oklch(0.85 0.01 75);
  --code-ink: oklch(0.5 0.12 40);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--surface);
  color: var(--ink);
  font-family: system-ui, sans-serif;
  line-height: 1.55;
}
.surface-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1.25rem;
  border-bottom: 1px solid var(--edge);
}
.wordmark { font-family: var(--font-mono); font-weight: 600; font-size: 1.1rem; }
.item-key {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  border: 1px solid var(--edge);
  border-radius: 999px;
  padding: 0.1rem 0.6rem;
}
.item-title { font-size: 1rem; font-weight: 600; margin: 0; flex: 1; }
.stepper { display: flex; gap: 0.9rem; list-style: none; margin: 0 1.25rem 0.6rem; padding: 0; }
.stage {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--ink-muted);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.stage::before {
  content: '';
  width: 0.6rem;
  height: 0.6rem;
  border: 1px solid var(--ink-muted);
  border-radius: 999px;
  display: inline-block;
}
.stage.is-done { color: var(--ink-muted); }
.stage.is-done::before {
  content: '\\2713';
  border-color: transparent;
  color: oklch(0.65 0.15 150);
  font-size: 0.65rem;
  line-height: 0.6rem;
}
.stage.is-current { color: var(--ink); font-weight: 700; }
.stage.is-current::before { background: var(--color-canvas); border-color: var(--color-canvas); }
.theme-switch { display: flex; gap: 0.25rem; }
.theme-switch button {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  background: none;
  color: var(--ink-muted);
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  cursor: pointer;
}
.theme-switch button.is-chosen { border-color: var(--color-canvas); color: var(--ink); }
.surface-frame { display: grid; grid-template-columns: 14rem 1fr; min-height: calc(100vh - 7rem); }
.surface-nav { display: flex; flex-direction: column; gap: 0.2rem; padding: 1rem; border-right: 1px solid var(--edge); }
.nav-entry {
  color: var(--ink);
  text-decoration: none;
  font-size: 0.9rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
}
.nav-entry.is-active { background: var(--color-canvas); color: var(--color-paper); }
.nav-entry.is-dimmed { color: var(--ink-muted); opacity: 0.6; }
.nav-child {
  color: var(--ink-muted);
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  padding: 0.2rem 0.75rem 0.2rem 1.6rem;
}
.nav-child.is-active { color: var(--color-canvas); }
.surface-main { padding: 1.25rem; max-width: 60rem; }
.surface-section { display: none; }
.surface-section.is-open { display: block; }
.not-written { color: var(--ink-muted); font-style: italic; }
.reading h2.reading-title { margin-top: 0; }
.badge-row { display: flex; gap: 0.5rem; }
.badge {
  display: inline-flex;
  gap: 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  border: 1px solid var(--edge);
  border-radius: 999px;
  padding: 0.1rem 0.6rem;
}
.badge-label { text-transform: uppercase; color: var(--ink-muted); }
.tldr {
  border: 1px solid var(--edge);
  border-left: 3px solid var(--color-canvas);
  border-radius: var(--radius-panel);
  background: var(--surface-raised);
  padding: 0.75rem 1rem;
  margin: 1rem 0;
}
.tldr-label { font-family: var(--font-mono); font-size: 0.7rem; color: var(--ink-muted); margin: 0 0 0.25rem; }
.tldr-body { margin: 0; }
.tldr.is-missing { border-left-color: var(--edge); color: var(--ink-muted); }
.read-card {
  border: 1px solid var(--edge);
  border-radius: var(--radius-panel);
  background: var(--surface-raised);
  padding: 1rem 1.25rem;
  margin: 1rem 0;
}
.read-card-head { margin: 0 0 0.5rem; font-size: 1rem; }
.chip {
  font-family: var(--font-mono);
  font-size: 0.8em;
  background: var(--surface);
  border: 1px solid var(--edge);
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
  color: var(--code-ink);
}
code { font-family: var(--font-mono); color: var(--code-ink); }
.consequences { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.consequence { border-radius: calc(var(--radius-panel) / 1.5); padding: 0.6rem 0.9rem; border: 1px solid var(--edge); }
.consequence-good { border-left: 3px solid oklch(0.65 0.15 150); }
.consequence-bad { border-left: 3px solid oklch(0.6 0.18 27); }
.consequence-head { margin: 0 0 0.3rem; font-size: 0.8rem; text-transform: uppercase; }
.step-cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; }
.step-card { display: flex; gap: 0.75rem; border: 1px solid var(--edge); border-radius: calc(var(--radius-panel) / 1.5); padding: 0.6rem 0.9rem; }
.step-number {
  font-family: var(--font-mono);
  color: var(--color-paper);
  background: var(--color-canvas);
  border-radius: 999px;
  width: 1.4rem;
  height: 1.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step-head { margin: 0 0 0.25rem; font-size: 0.95rem; }
.alt-cards { display: grid; gap: 0.75rem; }
.alt-card { border: 1px solid var(--edge); border-radius: calc(var(--radius-panel) / 1.5); padding: 0.6rem 0.9rem; }
.alt-card-head { margin: 0 0 0.35rem; font-size: 0.95rem; }
.alt-cost { display: flex; gap: 0.5rem; border-top: 1px dashed var(--edge); margin: 0.5rem 0 0; padding-top: 0.5rem; }
.alt-cost-label { font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; color: oklch(0.6 0.18 27); }
.feature { border: 1px solid var(--edge); border-radius: var(--radius-panel); background: var(--surface-raised); margin: 0 0 1rem; overflow: hidden; }
.feature pre { margin: 0; padding: 1rem; font-family: var(--font-mono); font-size: 0.85rem; overflow-x: auto; }
.diagram { margin: 0; }
.diagram svg { max-width: 100%; height: auto; }
[data-scheme='light'] .diagram-dark { display: none; }
[data-scheme='dark'] .diagram-light { display: none; }
.wireframe { width: 100%; height: 32rem; border: 1px solid var(--edge); border-radius: var(--radius-panel); background: var(--surface-raised); }
`;

export const surfaceBoot = `
const surfaceRoot = document.documentElement;
const storedTheme = localStorage.getItem('ket-surface-theme') ?? 'system';
const resolvedScheme = (choice) =>
  choice === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : choice;
surfaceRoot.setAttribute('data-scheme', resolvedScheme(storedTheme));
`;

export const surfaceWiring = `
const chooseTheme = (choice) => {
  localStorage.setItem('ket-surface-theme', choice);
  document.documentElement.setAttribute('data-scheme', resolvedScheme(choice));
  for (const button of document.querySelectorAll('[data-theme-choice]')) {
    button.classList.toggle('is-chosen', button.dataset.themeChoice === choice);
  }
};
for (const button of document.querySelectorAll('[data-theme-choice]')) {
  button.addEventListener('click', () => chooseTheme(button.dataset.themeChoice));
  button.classList.toggle('is-chosen', button.dataset.themeChoice === storedTheme);
}
const openSection = (id) => {
  for (const section of document.querySelectorAll('.surface-section')) {
    section.classList.toggle('is-open', section.id === 'section-' + id);
  }
  for (const entry of document.querySelectorAll('.nav-entry')) {
    entry.classList.toggle('is-active', entry.dataset.section === id);
  }
};
for (const entry of document.querySelectorAll('.nav-entry')) {
  entry.addEventListener('click', (opening) => {
    opening.preventDefault();
    openSection(entry.dataset.section);
  });
}
openSection(location.hash.slice(1) || document.documentElement.dataset.defaultSection);
`;
