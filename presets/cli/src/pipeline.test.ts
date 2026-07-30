import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLI_PRESET } from './item.ts';
import { CLI_SEMANTICS } from './semantics.ts';

async function readsPresetFile(name: string): Promise<string> {
  return readFile(join(import.meta.dirname, '..', 'files', name), 'utf8');
}

async function continuousIntegrationJobsItWrites(): Promise<string[]> {
  const written = await readsPresetFile('github-ci.yml');
  const jobs = written.slice(written.indexOf('jobs:'));

  return [...jobs.matchAll(/^ {2}(\S+):$/gmu)].map(([, job]) => job ?? '');
}

describe('the workflow the preset writes against the gates it declares', () => {
  it('runs every gate somewhere, so a gate cannot pass locally and go missing in the pipeline', async () => {
    const jobs = await continuousIntegrationJobsItWrites();

    for (const gate of CLI_SEMANTICS.gates) {
      expect({ script: gate.script, runs: jobs.includes(gate.ciJob) }).toStrictEqual({
        script: gate.script,
        runs: true,
      });
    }
  });

  it('runs no job no gate claims, so a job cannot outlive the gate it was written for', async () => {
    const claimed = new Set(CLI_SEMANTICS.gates.map((gate) => gate.ciJob));

    for (const job of await continuousIntegrationJobsItWrites()) {
      expect({ job, claimed: claimed.has(job) }).toStrictEqual({ job, claimed: true });
    }
  });
});

describe('the integrations the preset offers', () => {
  it('writes at least one file for every integration it offers', () => {
    for (const integration of CLI_PRESET.integrations) {
      expect({ name: integration.name, writes: integration.files.length > 0 }).toStrictEqual({
        name: integration.name,
        writes: true,
      });
    }
  });

  it('offers no integration whose files the preset also writes unasked', () => {
    const always = new Set(CLI_PRESET.files.map((file) => file.target));

    for (const integration of CLI_PRESET.integrations) {
      for (const file of integration.files) {
        expect({ target: file.target, always: always.has(file.target) }).toStrictEqual({
          target: file.target,
          always: false,
        });
      }
    }
  });
});

describe('the toolchain the preset declares', () => {
  it('uses every tool it declares, so a version pin cannot outlive its user', async () => {
    const declared = await readsPresetFile('mise.toml');
    const tools = [...declared.matchAll(/^(\S+) = /gmu)].map(([, tool]) => tool ?? '');
    const uses = [
      JSON.stringify(CLI_SEMANTICS.scripts),
      await readsPresetFile('lefthook.yml'),
      await readsPresetFile('github-ci.yml'),
    ].join('\n');

    for (const tool of tools) {
      expect({ tool, used: uses.includes(tool) }).toStrictEqual({ tool, used: true });
    }
  });

  it('installs the toolchain before it runs a tool from it', () => {
    for (const [name, script] of Object.entries(CLI_SEMANTICS.scripts)) {
      if (script.includes('mise exec')) {
        expect({ name, installs: script.includes('mise install') }).toStrictEqual({
          name,
          installs: true,
        });
      }
    }
  });
});

describe('what the cli preset offers a project', () => {
  it('offers the tools a command line project can use, and no renderer tool', () => {
    expect(CLI_PRESET.integrations.map((integration) => integration.name)).toStrictEqual([
      'codecov',
      'codeql',
      'coderabbit',
    ]);
  });

  it('writes each integration where the tool that reads it looks', () => {
    const written = CLI_PRESET.integrations.flatMap((integration) => integration.files);

    expect(written.map((file) => file.target)).toStrictEqual([
      '~/.github/workflows/coverage.yml',
      '~/.github/workflows/codeql.yml',
      '~/.coderabbit.yaml',
    ]);
  });

  it('names the tool in the sentence that offers it, so a picker can tell them apart', () => {
    for (const integration of CLI_PRESET.integrations) {
      expect({
        name: integration.name,
        names: integration.asks.toLowerCase().includes(integration.name),
      }).toStrictEqual({ name: integration.name, names: true });
    }
  });
});

describe('what an integration tells a person before they pick it', () => {
  it('says what a public repository pays and what a private one pays', () => {
    for (const integration of CLI_PRESET.integrations) {
      const said = integration.asks.toLowerCase();

      expect({
        name: integration.name,
        public: said.includes('public'),
        private: said.includes('private'),
      }).toStrictEqual({ name: integration.name, public: true, private: true });
    }
  });
});
