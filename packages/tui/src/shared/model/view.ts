import type { Status } from '../lib';
import type { Size, Stage } from '../lib';

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
