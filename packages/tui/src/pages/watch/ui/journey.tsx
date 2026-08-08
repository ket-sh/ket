import type { ReactNode } from 'react';

import type { JourneyView } from '../../../shared/model';
import type { JourneyFocus, JourneyTab } from '../model/frames.ts';

import { useTheme } from '../../../shared/theme';
import { SpanRow } from '../../../shared/ui';
import { journeyRows } from '../lib/canvas.ts';
import { panePlaceOf } from '../lib/pane-place.ts';
import { paneLinesOf } from '../lib/pane.ts';
import { tabsOf } from '../model/journey-tabs.ts';
import { ArtifactsPanel } from './artifacts-panel.tsx';
import { ChildrenPanel } from './children-panel.tsx';
import { OverviewPanel } from './overview-panel.tsx';
import { SidePane } from './side-pane.tsx';

export interface JourneyPageProps {
  journey: JourneyView;
  sel: string;
  tab: JourneyTab;
  pick: number;
  focus: JourneyFocus;
  now: string;
  tick: number;
  width: number;
  height: number;
}

function TabBar({ journey, tab }: { journey: JourneyView; tab: JourneyTab }): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="row">
      {tabsOf(journey).map(
        (name): ReactNode => (
          <text
            key={name}
            fg={name === tab ? theme.base : theme.subtext}
            bg={name === tab ? theme.blue : theme.base}
            wrapMode="none"
          >
            {` ${name} `}
          </text>
        ),
      )}
    </box>
  );
}

function CanvasRows({
  journey,
  sel,
  now,
  tick,
  width,
  height,
}: Omit<JourneyPageProps, 'tab' | 'pick' | 'focus'>): ReactNode {
  const { theme } = useTheme();
  const rows = journeyRows(
    journey,
    sel,
    now,
    tick,
    { width: Math.max(20, width - 2), height: Math.max(6, height) },
    theme,
  );

  return (
    <box flexDirection="column">
      {rows.map(
        (spans, index): ReactNode => (
          <SpanRow key={String(index)} spans={spans} />
        ),
      )}
    </box>
  );
}

const PANE_CHROME = 6;

function WorkflowPanel(props: Omit<JourneyPageProps, 'tab' | 'pick'>): ReactNode {
  const place = panePlaceOf(props.width);
  const lines = paneLinesOf(props.journey, props.now, place.paneWidth - PANE_CHROME);
  const canvasHeight = place.side === 'right' ? props.height : props.height - lines.length - 2;

  return (
    <box flexDirection={place.side === 'right' ? 'row' : 'column'}>
      <CanvasRows {...props} width={place.canvasWidth} height={Math.max(6, canvasHeight)} />
      <SidePane lines={lines} focus={props.focus} width={place.paneWidth} />
    </box>
  );
}

function PanelFor(props: JourneyPageProps): ReactNode {
  if (props.tab === 'overview') {
    return <OverviewPanel journey={props.journey} width={props.width} />;
  }

  if (props.tab === 'children') {
    return <ChildrenPanel journey={props.journey} pick={props.pick} now={props.now} />;
  }

  if (props.tab === 'artifacts') {
    return <ArtifactsPanel journey={props.journey} pick={props.pick} height={props.height} />;
  }

  return <WorkflowPanel {...props} />;
}

export function JourneyPage(props: JourneyPageProps): ReactNode {
  const { theme } = useTheme();
  const { journey } = props;

  return (
    <box flexDirection="column">
      <box
        border
        borderStyle="rounded"
        borderColor={theme.overlay}
        title={` ${journey.item} · journey `}
        flexDirection="column"
      >
        <TabBar journey={journey} tab={props.tab} />
        <PanelFor {...props} height={Math.max(6, props.height - 5)} />
      </box>
      {journey.standing === undefined ? null : (
        <text fg={theme.red} wrapMode="none">{`! ${journey.standing}`}</text>
      )}
    </box>
  );
}
