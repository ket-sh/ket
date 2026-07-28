import type { Status } from './appearance.ts';
import type { Size, Stage } from './pipeline.ts';

export interface StageView {
  stage: Stage;
  status: Status;
  note?: string;
  logs: string[];
}

export interface ItemView {
  id: string;
  title: string;
  size: Size;
  stages: StageView[];
}
