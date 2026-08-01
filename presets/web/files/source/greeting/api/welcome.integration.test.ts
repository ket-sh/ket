import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../../../test-support/network.ts';
import { welcome } from './welcome.ts';

const WHO = 'https://example.invalid/who';

describe('welcoming whoever the network names', () => {
  it('greets the name the answer carries', async () => {
    server.use(http.get(WHO, () => HttpResponse.json({ name: 'ada' })));

    await expect(welcome(WHO)).resolves.toBe('hello ada');
  });

  it('greets the world when the answer names nobody', async () => {
    server.use(http.get(WHO, () => HttpResponse.json({})));

    await expect(welcome(WHO)).resolves.toBe('hello world');
  });

  it('greets the world when the answer is a refusal', async () => {
    server.use(http.get(WHO, () => new HttpResponse(undefined, { status: 503 })));

    await expect(welcome(WHO)).resolves.toBe('hello world');
  });
});
