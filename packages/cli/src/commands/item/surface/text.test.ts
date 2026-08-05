import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { escaped, scriptSafeJson, slugOf } from './text.ts';

describe('the escaping every markup slot relies on', () => {
  it('maps each dangerous character to its entity', () => {
    expect(escaped('&')).toBe('&amp;');
    expect(escaped('<')).toBe('&lt;');
    expect(escaped('>')).toBe('&gt;');
    expect(escaped('"')).toBe('&quot;');
    expect(escaped("'")).toBe('&#39;');
  });

  it('keeps harmless text intact', () => {
    expect(escaped('The plain sentence.')).toBe('The plain sentence.');
  });

  it('leaves no dangerous character behind, whatever the text', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const safe = escaped(text);

        expect(safe).not.toMatch(/[<>"']/);
        expect(safe.replaceAll(/&(amp|lt|gt|quot|#39);/g, '')).not.toContain('&');
      }),
    );
  });
});

describe('the slug a file name anchors to', () => {
  it('lowers the name and joins word runs with single dashes', () => {
    expect(slugOf('The File.feature')).toBe('the-file-feature');
  });

  it('trims the dashes the edges would keep', () => {
    expect(slugOf('--Wrapped--')).toBe('wrapped');
  });

  it('never yields anything but dash-joined word runs', () => {
    fc.assert(
      fc.property(fc.string(), (name) => {
        expect(slugOf(name)).toMatch(/^$|^[a-z0-9]+(-[a-z0-9]+)*$/);
      }),
    );
  });
});

describe('the json a script element can hold', () => {
  it('escapes the angle bracket and the ampersand as unicode', () => {
    const safe = scriptSafeJson('</script> & on');

    expect(safe).toContain('u003c/script>');
    expect(safe).toContain('u0026');
    expect(safe).not.toContain('<');
    expect(safe).not.toContain('&');
  });

  it('round-trips any text through the parser unchanged', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const safe = scriptSafeJson(text);

        expect(JSON.parse(safe)).toBe(text);
        expect(safe).not.toContain('<');
        expect(safe).not.toContain('&');
      }),
    );
  });
});
