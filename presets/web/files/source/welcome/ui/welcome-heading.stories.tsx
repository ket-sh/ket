import type { Meta, StoryObj } from '@storybook/tanstack-react';

import { WelcomeHeading } from './welcome-heading.tsx';

const meta = { component: WelcomeHeading } satisfies Meta<typeof WelcomeHeading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Named: Story = { args: { project: 'atlas' } };

export const Nameless: Story = { args: { project: '   ' } };
