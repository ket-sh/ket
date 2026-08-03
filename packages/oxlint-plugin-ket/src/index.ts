import { definePlugin } from '@oxlint/plugins';

import { noBooleanSwitchParam } from './no-boolean-switch-param.ts';

export default definePlugin({
  meta: { name: 'ket' },
  rules: { 'no-boolean-switch-param': noBooleanSwitchParam },
});
