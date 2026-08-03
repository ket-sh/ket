import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../../../test-support/network.ts';
import { welcomed } from './welcomed.ts';

const WHOM = 'https://example.invalid/whom';

describe('welcoming whoever the network names', () => {
  it('welcomes the name the answer carries', async () => {
    server.use(http.get(WHOM, () => HttpResponse.json({ name: 'ada' })));

    await expect(welcomed(WHOM)).resolves.toBe('Welcome to ada.');
  });

  it('welcomes the nameless project when the answer names nobody', async () => {
    server.use(http.get(WHOM, () => HttpResponse.json({})));

    await expect(welcomed(WHOM)).resolves.toBe('Welcome to your project.');
  });

  it('welcomes the nameless project when the answer is a refusal', async () => {
    server.use(http.get(WHOM, () => new HttpResponse(undefined, { status: 503 })));

    await expect(welcomed(WHOM)).resolves.toBe('Welcome to your project.');
  });
});
