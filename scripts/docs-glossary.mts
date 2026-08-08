import { writeFileSync } from 'node:fs';

import { compiledOutputs, GLOSSARY_PATH } from './docs/glossary-outputs.mts';

for (const output of compiledOutputs()) {
  writeFileSync(output.path, output.content);
  console.log(`${output.path} rewritten from ${GLOSSARY_PATH}`);
}
