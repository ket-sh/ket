import { useCallback } from 'react';

import type { BoardFeed } from '../../../shared/model';
import type { DocsFocus, FrameStack, Grow } from './frames.ts';

import { docsFocused, docsSeated, docsSlid } from './screen-frames.ts';

type Shelving = Pick<FrameStack, 'openDocs' | 'docsSeat' | 'docsSlide' | 'docsFocus'>;

export function useDocsShelf(feed: BoardFeed, setFrames: Grow): Shelving {
  const openDocs = useCallback(() => {
    void feed.docsCatalog().then((catalog) => {
      setFrames((stack) => [...stack, { kind: 'docs', catalog, sel: 0, focus: 'catalog' }]);
    });
  }, [feed, setFrames]);

  const docsSeat = useCallback(
    (at: number) => {
      setFrames((stack) => docsSeated(stack, at));
    },
    [setFrames],
  );

  const docsSlide = useCallback(
    (delta: number, most: number) => {
      setFrames((stack) => docsSlid(stack, delta, most));
    },
    [setFrames],
  );

  const docsFocus = useCallback(
    (focus: DocsFocus) => {
      setFrames((stack) => docsFocused(stack, focus));
    },
    [setFrames],
  );

  return { openDocs, docsSeat, docsSlide, docsFocus };
}
