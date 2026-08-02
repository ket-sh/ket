import type { Meta, StoryObj } from '@storybook/react-vite';

import { WelcomeHeading } from './welcome-heading.tsx';

const meta = { component: WelcomeHeading } satisfies Meta<typeof WelcomeHeading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Named: Story = { args: { project: 'atlas' } };

export const Nameless: Story = { args: { project: '   ' } };
