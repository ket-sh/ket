import { existsSync, globSync } from 'node:fs';
import process from 'node:process';

const SIBLING_MARKS = /\.(stories|test|browser\.test)\.tsx$/u;

function isComponent(path: string): boolean {
  return !SIBLING_MARKS.test(path);
}

function missingPair(component: string): string[] {
  const story = component.replace(/\.tsx$/u, '.stories.tsx');
  const test = component.replace(/\.tsx$/u, '.browser.test.tsx');

  return [...(existsSync(story) ? [] : [story]), ...(existsSync(test) ? [] : [test])];
}

const unpaired = globSync('src/**/ui/*.tsx')
  .filter(isComponent)
  .flatMap((component) =>
    missingPair(component).map((missing) => `${component} misses ${missing}`),
  );

if (unpaired.length > 0) {
  console.error(
    `every ui component ships its story and its browser test, and these do not:\n${unpaired
      .map((line) => `  ${line}`)
      .join('\n')}`,
  );
  process.exit(1);
}

console.log('every ui component ships its story and its browser test');
