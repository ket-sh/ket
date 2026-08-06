import { describe, expect, it } from 'vitest';

import { audiencePanel } from './audience.ts';

describe('the audiences a panel offers', () => {
  it('wraps both variants under the group with technical active', () => {
    const panel = audiencePanel(
      'Spec',
      'spec',
      '<p>the technical read</p>',
      '<p>the plain read</p>',
    );

    expect(panel.body).toBe(
      '<div class="audience-variants" data-audience-group="spec"><div class="audience-variant is-active" data-audience="technical"><p>the technical read</p></div><div class="audience-variant" data-audience="plain"><p>the plain read</p></div></div>',
    );
  });

  it('offers both audiences from the panel head when a plain version exists', () => {
    const panel = audiencePanel('Spec', 'spec', '<p>t</p>', '<p>p</p>');

    expect(panel.label).toBe('Spec');
    expect(panel.controls).toBe(
      '<span class="audience-switch" data-audience-group="spec"><button type="button" class="audience-option is-selected" data-audience="technical">Technical</button><button type="button" class="audience-option" data-audience="plain">Plain language</button></span>',
    );
  });

  it('dims and blocks the plain option when no plain version exists, saying why', () => {
    const panel = audiencePanel('Decision', 'decision', '<p>t</p>', '');

    expect(panel.controls).toBe(
      '<span class="audience-switch" data-audience-group="decision"><button type="button" class="audience-option is-selected" data-audience="technical">Technical</button><button type="button" class="audience-option is-dimmed" data-audience="plain" disabled aria-disabled="true">Plain language</button><span class="audience-note">No plain version written.</span></span>',
    );
  });

  it('fills an unwritten technical variant with the unwritten paragraph', () => {
    const panel = audiencePanel('Spec', 'spec', '', '<p>p</p>');

    expect(panel.body).toContain(
      '<div class="audience-variant is-active" data-audience="technical"><p class="unwritten">Not written at this stage.</p></div>',
    );
  });

  it('fills a missing plain variant with the no-plain paragraph', () => {
    const panel = audiencePanel('Spec', 'spec', '<p>t</p>', '');

    expect(panel.body).toContain(
      '<div class="audience-variant" data-audience="plain"><p class="unwritten">No plain version written.</p></div>',
    );
  });
});
