import type { Meta, StoryObj } from '@storybook/tanstack-react';

import { Button } from './button.tsx';

const meta = { component: Button } satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { children: 'Start a feature' } };

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Read the docs' },
};

export const Outline: Story = {
  args: { variant: 'outline', children: 'Read the standing law' },
};
