export interface PipelineCommand {
  name: string;
  says: string;
}

export const PIPELINE_COMMANDS: PipelineCommand[] = [
  { name: 'feature', says: 'File a piece of work and carry it to the first gate' },
  { name: 'explore', says: 'Think a piece of work through before filing it' },
  { name: 'approve', says: 'Pass the human gate so implementation may begin' },
  { name: 'continue', says: 'Pick up the item in flight and carry it onward' },
  { name: 'review', says: 'Review with two seats and a judge that settles them' },
  { name: 'ship', says: 'Close an item once its pull request has merged' },
  { name: 'status', says: 'Show what is in flight and what each item is waiting on' },
  { name: 'map', says: 'Sit down with a person and run the story mapping session' },
];
