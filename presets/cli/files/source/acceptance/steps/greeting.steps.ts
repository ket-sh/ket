import { Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';

import { runBuilt } from '../run-built.ts';

let said = '';

When('they run {string}', async function (command: string) {
  said = await runBuilt(command);
});

Then('it says {string}', function (expected: string) {
  assert.equal(said.trim(), expected);
});
