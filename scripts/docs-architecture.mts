import { mkdirSync, writeFileSync } from 'node:fs';

import { readDependencyGraph } from './docs/dependency-graph.mts';
import { renderSkeleton } from './docs/skeleton.mts';

mkdirSync('docs/architecture', { recursive: true });
writeFileSync('docs/architecture/skeleton.md', renderSkeleton(readDependencyGraph()));
console.log('docs/architecture/skeleton.md rewritten from the dependency graph');
