import type { PresetItem } from '@ket/preset';

import { STANDING_FILES, STANDING_INTEGRATIONS, STANDING_TOOLCHAIN, writes } from '@ket/preset';

export const WEB_PRESET: PresetItem = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'ket-web',
  type: 'registry:item',
  title: 'ket web',
  description:
    'A TanStack Start application under ket, with the gate chain ket runs against itself.',
  dependencies: [
    '@tanstack/react-router@1.170.18',
    '@tanstack/react-start@1.168.34',
    'react@19.2.8',
    'react-dom@19.2.8',
  ],
  devDependencies: [
    ...STANDING_TOOLCHAIN,
    'vite@8.2.0',
    '@vitejs/plugin-react@6.0.5',
    '@playwright/test@1.62.1',
    'steiger@0.6.0',
    '@feature-sliced/steiger-plugin@0.7.0',
    '@steiger/toolkit@0.2.3',
    '@types/react@19.2.18',
    '@types/react-dom@19.2.4',
  ],
  files: [
    ...STANDING_FILES,
    writes('vite.config.ts', 'vite.config.ts'),
    writes('playwright.config.ts', 'playwright.config.ts'),
    writes('steiger.config.ts', 'steiger.config.ts'),
    writes('source/router.tsx', 'src/app/router.tsx'),
    writes('source/routeTree.gen.ts', 'src/app/routeTree.gen.ts'),
    writes('source/routes/__root.tsx', 'src/app/routes/__root.tsx'),
    writes('source/routes/index.tsx', 'src/app/routes/index.tsx'),
    writes('source/greeting/model/greeting.ts', 'src/entities/greeting/model/greeting.ts'),
    writes(
      'source/greeting/model/greeting.test.ts',
      'src/entities/greeting/model/greeting.test.ts',
    ),
    writes(
      'source/greeting/model/greeting.property.test.ts',
      'src/entities/greeting/model/greeting.property.test.ts',
    ),
    writes('source/greeting/ui/greeting-panel.tsx', 'src/entities/greeting/ui/greeting-panel.tsx'),
    writes('source/greeting/index.ts', 'src/entities/greeting/index.ts'),
    writes('source/e2e/greeting.spec.ts', 'e2e/greeting.spec.ts'),
  ],
  integrations: [
    {
      name: 'mobbin',
      asks: 'mobbin is a gallery of shipped screens to design against. A seat costs the same whether the repository is public or private.',
      reaches: { stage: 'designing', reference: 'https://mobbin.com' },
    },
    {
      name: 'chromatic',
      asks: 'chromatic reviews what a page looks like on each push. Free to 5000 snapshots a month on a public repository or a private one, then paid.',
      installs: ['chromatic@18.1.0', '@chromatic-com/playwright@0.14.11'],
      files: [
        writes('github-chromatic.yml', '.github/workflows/chromatic.yml'),
        writes('source/chromatic/greeting.spec.ts', 'e2e/greeting.spec.ts'),
      ],
    },
    ...STANDING_INTEGRATIONS,
  ],
};
