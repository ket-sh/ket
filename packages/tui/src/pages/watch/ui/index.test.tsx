import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { SAMPLE } from '../../../shared/model';
import { WatchPage } from './index.tsx';

let rendered: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
  rendered?.renderer.destroy();
  rendered = undefined;
});

async function frameOf(width: number, height: number): Promise<string> {
  rendered = await testRender(<WatchPage item={SAMPLE} />, { width, height });

  await rendered.renderOnce();

  return rendered.captureCharFrame();
}

describe('the watch page', () => {
  it('names the item it is watching', async () => {
    const frame = await frameOf(120, 30);

    expect(frame).toContain('AUTH-3');
    expect(frame).toContain('login with lockout');
  });

  it('draws every stage the size runs', async () => {
    const frame = await frameOf(160, 30);

    for (const stage of ['triage', 'research', 'design', 'implement', 'verify', 'ship']) {
      expect(frame).toContain(stage);
    }
  });

  it('reports the loop a row of boxes cannot draw', async () => {
    const frame = await frameOf(120, 30);

    expect(frame).toContain('verify fails and returns to implement');
  });

  it('opens on the first stage and shows its log', async () => {
    const frame = await frameOf(120, 30);

    expect(frame).toContain('classified kind=feature');
  });
});
