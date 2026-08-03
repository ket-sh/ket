import type { Meta, StoryObj } from '@storybook/tanstack-react';

import { Badge } from './badge.tsx';

const meta = { component: Badge } satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: 'ket web preset' } };

export const Outline: Story = {
  args: { variant: 'outline', children: 'ket web preset' },
};
