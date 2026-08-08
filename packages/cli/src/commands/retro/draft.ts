import type { DormantGate } from './dormant.ts';
import type { RefusalCluster } from './friction.ts';

export interface DraftEvidence {
  gate: string;
  reason: string | undefined;
  moments: string[];
  items: string[];
}

export interface Draft {
  number: number;
  sentence: string;
  evidence: DraftEvidence;
}

const EXAMINE = 'examine whether the rule still earns its place';

export const LOG_SCOPE =
  'The log sees a gate only when a session runs its script, ' +
  'so a run at commit time or in CI leaves no line here.';

export function withoutStop(text: string): string {
  return text.endsWith('.') ? text.slice(0, -1) : text;
}

export function timesOf(count: number): string {
  return count === 1 ? 'once' : `${String(count)} times`;
}

export function momentTextOf(at: number): string {
  return new Date(at).toISOString();
}

function adviceOf(cluster: RefusalCluster): string {
  return cluster.count === 1
    ? 'consider a rule change recorded in an ADR'
    : `run \`ket gate ${cluster.gate}\` where the work starts`;
}

function clusterSentenceOf(cluster: RefusalCluster): string {
  const said = withoutStop(cluster.reason);

  return `\`${cluster.gate}\` refused ${timesOf(cluster.count)}: ${said}; ${adviceOf(cluster)}`;
}

export function clusterDraftOf(cluster: RefusalCluster, number: number): Draft {
  return {
    number,
    sentence: clusterSentenceOf(cluster),
    evidence: {
      gate: cluster.gate,
      reason: cluster.reason,
      moments: cluster.moments.map((moment) => momentTextOf(moment)),
      items: cluster.items,
    },
  };
}

export function sightingOf(dormant: DormantGate): string {
  return dormant.seen === undefined
    ? `the log has never recorded \`${dormant.gate}\``
    : `the log last recorded \`${dormant.gate}\` at ${momentTextOf(dormant.seen)}`;
}

export function dormantDraftOf(dormant: DormantGate): Draft {
  return {
    number: 1,
    sentence: `${sightingOf(dormant)}; ${EXAMINE}`,
    evidence: {
      gate: dormant.gate,
      reason: undefined,
      moments: dormant.seen === undefined ? [] : [momentTextOf(dormant.seen)],
      items: [],
    },
  };
}
