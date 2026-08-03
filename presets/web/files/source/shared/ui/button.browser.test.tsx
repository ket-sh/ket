import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';

import { Button } from './button.tsx';

describe('a button', () => {
  it('carries its label to whoever reads the page', async () => {
    const screen = await render(<Button>Start a feature</Button>);

    await expect.element(screen.getByRole('button', { name: 'Start a feature' })).toBeVisible();
  });

  it('becomes the anchor it is told to render as', async () => {
    const screen = await render(
      <Button render={<a href="https://ket.sh/docs">Read the docs</a>} />,
    );

    await expect
      .element(screen.getByRole('link', { name: 'Read the docs' }))
      .toHaveAttribute('href', 'https://ket.sh/docs');
  });
});
