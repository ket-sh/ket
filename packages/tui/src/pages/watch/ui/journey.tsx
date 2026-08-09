import type { BoxRenderable, MouseEvent } from '@opentui/core';
import type { ReactNode } from 'react';

import { useRef } from 'react';

import type { JourneyView } from '../../../shared/model';
import type { CanvasSpot } from '../lib/canvas.ts';
import type { PaneLine } from '../lib/pane.ts';
import type { JourneyFocus, JourneyTab } from '../model/frames.ts';
import type { WatchMouse } from '../model/mouse.ts';
import type { PanelProps } from './artifacts-panel.tsx';

import { useTheme } from '../../../shared/theme';
import { SpanRow } from '../../../shared/ui';
import { journeyRows, overflowsAcross, stageAt } from '../lib/canvas.ts';
import { paneFitOf, panePlaceOf } from '../lib/pane-place.ts';
import { paneLinesOf } from '../lib/pane.ts';
import { tabsOf } from '../model/journey-tabs.ts';
import { ArtifactsPanel } from './artifacts-panel.tsx';
import { ChildrenPanel } from './children-panel.tsx';
import { OverviewPanel } from './overview-panel.tsx';
import { SidePane } from './side-pane.tsx';

export interface JourneyPageProps extends PanelProps {
  sel: string;
  tab: JourneyTab;
  now: string;
  tick: number;
  width: number;
  wide: boolean;
}

function TabBar({
  journey,
  tab,
  focus,
  mouse,
}: {
  journey: JourneyView;
  tab: JourneyTab;
  focus: JourneyFocus;
  mouse: WatchMouse;
}): ReactNode {
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
            onMouseDown={(event: MouseEvent) => {
              event.stopPropagation();
              mouse.tabLabel(name);
            }}
          >
            {` ${name === tab && focus === 'tabs' ? '▸ ' : ''}${name} `}
          </text>
        ),
      )}
    </box>
  );
}

type CanvasProps = Omit<JourneyPageProps, 'tab' | 'pick' | 'focus' | 'wide'>;

function viewOf(width: number, height: number): { width: number; height: number } {
  return { width: Math.max(20, width - 2), height: Math.max(6, height) };
}

function spotWithin(box: BoxRenderable | null, event: MouseEvent): CanvasSpot {
  return { x: event.x - (box?.x ?? 0), y: event.y - (box?.y ?? 0) };
}

function CanvasRows({ journey, sel, now, tick, width, height, mouse }: CanvasProps): ReactNode {
  const { theme } = useTheme();
  const canvasRef = useRef<BoxRenderable>(null);
  const view = viewOf(width, height);
  const rows = journeyRows(journey, sel, now, tick, view, theme);

  const chooseAt = (event: MouseEvent): void => {
    const id = stageAt(journey, sel, view, spotWithin(canvasRef.current, event));

    if (id !== undefined) {
      event.stopPropagation();
      mouse.stage(id);
    }
  };

  const wheelAt = (event: MouseEvent): void => {
    const direction = event.scroll?.direction;

    if (direction !== undefined && overflowsAcross(journey, view.width)) {
      mouse.canvasWheel(direction);
    }
  };

  return (
    <box ref={canvasRef} flexDirection="column" onMouseDown={chooseAt} onMouseScroll={wheelAt}>
      {rows.map(
        (spans, index): ReactNode => (
          <SpanRow key={String(index)} spans={spans} />
        ),
      )}
    </box>
  );
}

const PANE_CHROME = 6;

const STAGE_CHROME = 5;

function PanelFor(props: JourneyPageProps): ReactNode {
  if (props.tab === 'overview') {
    return <OverviewPanel journey={props.journey} width={props.width} />;
  }

  if (props.tab === 'children') {
    return <ChildrenPanel journey={props.journey} pick={props.pick} now={props.now} />;
  }

  if (props.tab === 'artifacts') {
    return (
      <ArtifactsPanel
        journey={props.journey}
        pick={props.pick}
        focus={props.focus}
        cur={props.cur}
        aud={props.aud}
        height={props.height}
        mouse={props.mouse}
      />
    );
  }

  return <CanvasRows {...props} />;
}

function StageLegend(props: JourneyPageProps): ReactNode {
  const { theme } = useTheme();

  return (
    <box
      border
      borderStyle="rounded"
      borderColor={theme.overlay}
      title={` ${props.journey.item} · journey `}
      width={props.width}
      flexDirection="column"
      flexShrink={0}
      overflow="hidden"
    >
      <TabBar journey={props.journey} tab={props.tab} focus={props.focus} mouse={props.mouse} />
      <PanelFor
        {...props}
        width={Math.max(20, props.width - 2)}
        height={Math.max(6, props.height - STAGE_CHROME)}
      />
    </box>
  );
}

function paneRoomOf(width: number): number {
  return Math.max(10, width - PANE_CHROME);
}

function ItemLegend({
  lines,
  focus,
  width,
  mouse,
}: {
  lines: PaneLine[];
  focus: JourneyFocus;
  width: number;
  mouse: WatchMouse;
}): ReactNode {
  return <SidePane lines={lines} focus={focus} width={width} onChildren={mouse.paneChildren} />;
}

function WideLegend(props: JourneyPageProps): ReactNode {
  if (props.focus !== 'pane') {
    return <StageLegend {...props} />;
  }

  const lines = paneLinesOf(props.journey, props.now, paneRoomOf(props.width));

  return <ItemLegend lines={lines} focus={props.focus} width={props.width} mouse={props.mouse} />;
}

function SplitLegends(props: JourneyPageProps): ReactNode {
  const place = panePlaceOf(props.width);
  const lines = paneLinesOf(props.journey, props.now, paneRoomOf(place.paneWidth));

  if (place.side === 'right') {
    return (
      <box flexDirection="row">
        <StageLegend {...props} width={place.canvasWidth} />
        <ItemLegend lines={lines} focus={props.focus} width={place.paneWidth} mouse={props.mouse} />
      </box>
    );
  }

  const fit = paneFitOf(Math.max(6, props.height - STAGE_CHROME), lines.length);

  return (
    <box flexDirection="column">
      <StageLegend {...props} height={fit.canvasHeight + STAGE_CHROME} />
      {fit.paneLines === 0 ? null : (
        <ItemLegend
          lines={lines.slice(0, fit.paneLines)}
          focus={props.focus}
          width={place.paneWidth}
          mouse={props.mouse}
        />
      )}
    </box>
  );
}

export function JourneyPage(props: JourneyPageProps): ReactNode {
  const { theme } = useTheme();
  const { journey } = props;

  return (
    <box flexDirection="column">
      {props.wide ? <WideLegend {...props} /> : <SplitLegends {...props} />}
      {journey.standing === undefined ? null : (
        <text fg={theme.red} wrapMode="none">{`! ${journey.standing}`}</text>
      )}
    </box>
  );
}
