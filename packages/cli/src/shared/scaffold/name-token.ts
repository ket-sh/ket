import type { Configuration } from '../../shared/configuration.ts';

const PROJECT_NAME_TOKEN = '__PROJECT_NAME__';

const PROJECT_KEY_TOKEN = '__PROJECT_KEY__';

const HERO_HINT_TEXT_TOKEN = '__HERO_HINT_TEXT__';

const HERO_HINT_CODE_TOKEN = '__HERO_HINT_CODE__';

export interface HeroHint {
  readonly text: string;
  readonly code: string;
}

export interface ProjectNames {
  readonly name: string;
  readonly key: string;
  readonly hint: HeroHint;
}

const DRIVEN_BY_THE_PIPELINE: HeroHint = {
  text: 'Start your first feature in Claude Code with',
  code: '/ket:feature "your prompt"',
};

const EDITED_BY_HAND: HeroHint = {
  text: 'Make it yours: edit',
  code: 'src/entities/welcome',
};

export function heroHint(configuration: Configuration): HeroHint {
  return configuration.workflow ? DRIVEN_BY_THE_PIPELINE : EDITED_BY_HAND;
}

export function withProjectNames(contents: string, project: ProjectNames): string {
  return contents
    .replaceAll(PROJECT_NAME_TOKEN, project.name)
    .replaceAll(PROJECT_KEY_TOKEN, project.key)
    .replaceAll(HERO_HINT_TEXT_TOKEN, project.hint.text)
    .replaceAll(HERO_HINT_CODE_TOKEN, project.hint.code);
}
