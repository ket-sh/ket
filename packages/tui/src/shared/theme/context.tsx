import type { ThemeMode } from '@opentui/core';
import type { ReactNode } from 'react';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { Theme } from './themes.ts';

import { restingOf } from './resting.ts';
import { KANAGAWA, THEMES } from './themes.ts';

interface Wardrobe {
  theme: Theme;
  name: string;
  preview: (index: number) => void;
  keep: (index: number) => void;
  revert: () => void;
  rest: (mode: ThemeMode | null) => void;
}

const RESTING: Wardrobe = {
  theme: KANAGAWA,
  name: 'kanagawa',
  preview: () => undefined,
  keep: () => undefined,
  revert: () => undefined,
  rest: () => undefined,
};

const ThemeContext = createContext<Wardrobe>(RESTING);

function wornOf(kept: number, previewed: number | undefined): [string, Theme] {
  return THEMES[previewed ?? kept] ?? ['kanagawa', KANAGAWA];
}

export function ThemeProvider({ children }: { children: ReactNode }): ReactNode {
  const [kept, setKept] = useState(0);
  const [chosen, setChosen] = useState(false);
  const [previewed, setPreviewed] = useState<number | undefined>(undefined);
  const [name, theme] = wornOf(kept, previewed);

  const preview = useCallback((index: number) => {
    setPreviewed(index);
  }, []);

  const keep = useCallback((index: number) => {
    setKept(index);
    setChosen(true);
    setPreviewed(undefined);
  }, []);

  const revert = useCallback(() => {
    setPreviewed(undefined);
  }, []);

  const rest = useCallback(
    (mode: ThemeMode | null) => {
      if (!chosen) {
        setKept(restingOf(mode));
      }
    },
    [chosen],
  );

  const wardrobe = useMemo(
    () => ({ theme, name, preview, keep, revert, rest }),
    [theme, name, preview, keep, revert, rest],
  );

  return <ThemeContext.Provider value={wardrobe}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Wardrobe {
  return useContext(ThemeContext);
}
