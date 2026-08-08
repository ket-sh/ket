import type { ReactNode } from 'react';

import { useKeyboard } from '@opentui/react';
import { useState } from 'react';

import type { MapReadingView } from '../../../shared/model';

import { ThemeProvider, useTheme } from '../../../shared/theme';
import { MapPane, walkedIn } from '../../../widgets/story-map';

const HINTS = '←↑↓→ move · q quit';

export interface MapScreenProps {
  reading: MapReadingView;
  onQuit: () => void;
}

function MapRoom({ reading, onQuit }: MapScreenProps): ReactNode {
  const { theme } = useTheme();
  const [at, setAt] = useState(0);

  useKeyboard((key) => {
    if (key.name === 'q' || key.name === 'escape') {
      onQuit();

      return;
    }

    setAt((seated) => walkedIn(reading, seated, key.name));
  });

  return (
    <box flexDirection="column" paddingTop={1} paddingLeft={1} paddingRight={1}>
      <MapPane reading={reading} at={at} />
      <text wrapMode="none" fg={theme.overlay}>
        {HINTS}
      </text>
    </box>
  );
}

export function MapScreen({ reading, onQuit }: MapScreenProps): ReactNode {
  return (
    <ThemeProvider>
      <MapRoom reading={reading} onQuit={onQuit} />
    </ThemeProvider>
  );
}
