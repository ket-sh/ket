import { env } from 'node:process';

// A suite that lets the host's git configuration through measures the machine
// instead of ket: its signing key, its hooks path, its aliases. Nulling both
// files leaves no identity behind either, and the committed path is the one
// under test, so the environment carries one.
const NOTHING = '/dev/null';
const SUITE_NAME = 'ket suite';
const SUITE_EMAIL = 'suite@ket.invalid';

env['GIT_CONFIG_GLOBAL'] = NOTHING;
env['GIT_CONFIG_SYSTEM'] = NOTHING;
env['GIT_AUTHOR_NAME'] = SUITE_NAME;
env['GIT_AUTHOR_EMAIL'] = SUITE_EMAIL;
env['GIT_COMMITTER_NAME'] = SUITE_NAME;
env['GIT_COMMITTER_EMAIL'] = SUITE_EMAIL;
