import type { ReactNode } from 'react';

import type { StageView } from '../../../shared/model';

const MUTED = '#5f5f5f';

const FAINT = '#464646';

const ALERT = '#e06c75';

function LogBody({ logs }: { logs: string[] }): ReactNode {
  if (logs.length === 0) {
    return <text fg={FAINT}>{'  nothing yet, this stage has not started'}</text>;
  }

  return (
    <>
      {logs.map(
        (line, at): ReactNode => (
          <text key={`${line}-${String(at)}`} fg={line.startsWith('gate') ? ALERT : MUTED}>
            {`  ${line}`}
          </text>
        ),
      )}
    </>
  );
}

export function StageLog({ stage }: { stage: StageView | undefined }): ReactNode {
  const logs = stage?.logs ?? [];

  return (
    <box flexGrow={1} flexDirection="column" paddingLeft={1} paddingTop={1}>
      <text>
        <strong>{` ${stage?.stage ?? ''} `}</strong>
        <span fg={FAINT}>{`${String(logs.length)} events`}</span>
      </text>
      <scrollbox flexGrow={1} scrollY>
        <LogBody logs={logs} />
      </scrollbox>
    </box>
  );
}
