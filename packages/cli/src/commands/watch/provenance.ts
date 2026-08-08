import type { RepoFacts } from '../../shared/journey-node.ts';

import { gitSaid } from '../../shared/git.ts';

const DEFAULT_BRANCH = 'main';

const DETACHED = 'HEAD';

type Filing = RepoFacts['filed'];

type Branch = RepoFacts['branch'];

// A name never carries a line break, so the two fields ride on their own lines
// and no separator has to be escaped into the argument.
function filingFrom(said: string): Filing {
  const [by, at] = said.split('\n');

  return by === undefined || at === undefined || by === '' ? undefined : { by, at };
}

// The commit that added the item's directory is the moment somebody filed it,
// and its author is who did.
async function filedIn(root: string, key: string): Promise<Filing> {
  const said = await gitSaid(
    ['log', '--diff-filter=A', '--reverse', '--format=%an%n%aI', '--', `.ket/items/${key}`],
    root,
  );

  return said === undefined || said === '' ? undefined : filingFrom(said);
}

function countedFrom(said: string | undefined): number | undefined {
  const commits = Number(said);

  return said === undefined || said === '' || Number.isNaN(commits) ? undefined : commits;
}

// Resting on the default branch means there is no work branch to name, which
// is the whole of "when derivable" until an item records a branch of its own.
async function branchIn(root: string): Promise<Branch> {
  const name = await gitSaid(['rev-parse', '--abbrev-ref', DETACHED], root);

  if (name === undefined || name === DETACHED || name === DEFAULT_BRANCH) {
    return undefined;
  }

  const counted = await gitSaid(['rev-list', '--count', `${DEFAULT_BRANCH}..HEAD`], root);
  const commits = countedFrom(counted);

  return commits === undefined ? undefined : { name, commits };
}

export async function repoFactsFor(root: string, key: string): Promise<RepoFacts> {
  const [filed, branch] = await Promise.all([filedIn(root, key), branchIn(root)]);

  return { filed, branch };
}
