import type { MapBandView, MapRibView, StoryMapView } from '../../../shared/model';

export const LONG_GOAL =
  'a developer signs in, runs the built-in launch playbook end to end, and completes a launch';

function crowdedSpine(): MapRibView[] {
  return [
    {
      activity: 'start the launch',
      steps: [
        { id: 's-playbook', name: 'pick the playbook' },
        { id: 's-draft', name: 'draft the notes' },
      ],
    },
    {
      activity: 'work the steps',
      steps: [
        { id: 's-check', name: 'check off a step' },
        { id: 's-skip', name: 'skip a step' },
      ],
    },
    { activity: 'watch your progress', steps: [{ id: 's-bar', name: 'see the bar' }] },
    {
      activity: 'make the list yours',
      steps: [
        { id: 's-edit', name: 'edit the playbook' },
        { id: 's-add', name: 'add a step' },
      ],
    },
    { activity: 'share your list', steps: [{ id: 's-link', name: 'hand out a link' }] },
  ];
}

function crowdedBands(): MapBandView[] {
  return [
    {
      id: 'r-skeleton',
      name: 'walking skeleton',
      outcome: LONG_GOAL,
      cards: [
        { id: 'st-see', name: 'see the built-in playbook', step: 's-playbook', user: 'u-dev' },
        { id: 'st-start', name: 'start a launch from the playbook', step: 's-playbook' },
        { id: 'st-tick', name: 'tick a step done', step: 's-check', user: 'u-dev' },
      ],
    },
    {
      id: 'r-yours',
      name: 'make the list yours',
      outcome: 'a developer tailors the playbook before running it',
      cards: [
        { id: 'st-order', name: 'reorder the steps', step: 's-edit', user: 'u-dev' },
        { id: 'st-add', name: 'add a custom step', step: 's-add' },
      ],
    },
    {
      id: 'r-shared',
      name: 'launch on a shared list',
      outcome: 'two developers work one launch together',
      cards: [{ id: 'st-link', name: 'share a link to your list', step: 's-link', user: 'u-dev' }],
    },
    {
      id: undefined,
      name: 'unassigned',
      outcome: undefined,
      cards: [{ id: 'st-fill', name: 'watch the bar fill', step: 's-bar' }],
    },
  ];
}

export function crowdedMap(): StoryMapView {
  return {
    product: {
      name: 'countdown',
      idea: 'a launch checklist that walks a developer through announcing a release',
    },
    spine: crowdedSpine(),
    bands: crowdedBands(),
  };
}
