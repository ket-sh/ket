export interface PipelineCommand {
  name: string;
  says: string;
}

export const PIPELINE_COMMANDS: PipelineCommand[] = [
  { name: 'approve', says: 'Pass the human gate so implementation may begin' },
  { name: 'continue', says: 'Pick up the item in flight and carry it onward' },
  { name: 'explore', says: 'Think a piece of work through before filing it' },
  { name: 'feature', says: 'File a piece of work and carry it to the first gate' },
  { name: 'review', says: 'Review with two seats and a judge that settles them' },
  { name: 'status', says: 'Show what is in flight and what each item is waiting on' },
];
