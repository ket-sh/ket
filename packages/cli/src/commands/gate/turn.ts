import { readLog, record } from '../../shared/event-log.ts';
import { readStored } from '../../shared/item-store.ts';
import { ketRootFrom } from '../../shared/locate.ts';
import { inFlightFrom } from '../../shared/read-item.ts';
import { standingOf, turnEventFor, turnFor } from '../../shared/turn-gate.ts';
import { turnHistoryIn } from '../../shared/turn-history.ts';
import { jobIn } from '../../shared/write-gate.ts';
import { readEnvelope } from './context.ts';
import { overriddenBy } from './envelope.ts';

// Nothing bounds a loop an agent ends by itself, so a stop is where the
// pipeline gets asked whether the work reached a resting place. A repository
// ket never touched, and a session holding no single job, hear nothing.
export async function judgeStop(): Promise<string | undefined> {
  const envelope = await readEnvelope();
  const root = await ketRootFrom(process.cwd());

  if (root === undefined) {
    return undefined;
  }

  const job = jobIn(inFlightFrom(await readStored(root)));

  if (job === undefined) {
    return undefined;
  }

  const decision = turnFor({
    job,
    overridden: overriddenBy(envelope),
    ...turnHistoryIn(await readLog(root), standingOf(job)),
  });

  await record(root, turnEventFor(job, decision));

  return 'refused' in decision ? decision.refused : undefined;
}
