import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';

import { WelcomeHeading } from './welcome-heading.tsx';

describe('a welcome heading', () => {
  it('greets the visitor by project name', async () => {
    const screen = render(<WelcomeHeading project="atlas" />);

    await expect
      .element(screen.getByRole('heading', { level: 1, name: 'Welcome to atlas.' }))
      .toBeVisible();
  });

  it('falls back to a generic greeting when the project name is blank', async () => {
    const screen = render(<WelcomeHeading project="   " />);

    await expect
      .element(screen.getByRole('heading', { level: 1, name: 'Welcome to your project.' }))
      .toBeVisible();
  });
});
