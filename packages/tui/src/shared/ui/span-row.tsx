import type { ReactNode } from 'react';

import type { Ln } from '../lib';

function paintOf(fg: string | undefined, bg: string | undefined): { fg?: string; bg?: string } {
  return { ...(fg === undefined ? {} : { fg }), ...(bg === undefined ? {} : { bg }) };
}

export function SpanRow({ spans }: { spans: Ln }): ReactNode {
  return (
    <text wrapMode="none">
      {spans.map(
        (span, index): ReactNode =>
          span.fg === undefined && span.bg === undefined ? (
            span.text
          ) : (
            <span key={String(index)} {...paintOf(span.fg, span.bg)}>
              {span.text}
            </span>
          ),
      )}
    </text>
  );
}
