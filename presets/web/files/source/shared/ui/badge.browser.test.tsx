import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';

import { Badge } from './badge.tsx';

describe('a badge', () => {
  it('renders its text and remains visible to the reader', async () => {
    const screen = render(<Badge variant="outline">ket web preset</Badge>);

    await expect.element(screen.getByText('ket web preset')).toBeVisible();
  });
});
