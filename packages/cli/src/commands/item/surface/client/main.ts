import { wireAudience } from './audience.ts';
import { wireBricks } from './bricks.ts';
import { wireCallouts } from './callouts.ts';
import { ketSurface } from './carried.ts';
import { wireDiffview } from './diffview.ts';
import { wireEditors } from './editor.ts';
import { wireNav } from './nav.ts';
import { wireSidebar } from './sidebar.ts';
import { wireTheme } from './theme.ts';

wireNav();
wireAudience();
wireCallouts();
wireTheme();
wireDiffview();
wireBricks();
wireSidebar();
wireEditors();

const live = new WebSocket('ws://' + location.host + ketSurface.live);

live.onmessage = () => {
  location.reload();
};
