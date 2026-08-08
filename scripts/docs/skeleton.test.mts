import { describe, expect, it } from 'vitest';

import { headingAnchors } from '../../packages/cli/src/shared/docs-architecture.ts';
import { parseDependencyGraph, renderSkeleton } from './skeleton.mts';

const graph = {
  modules: [
    {
      source: 'packages/cli/src/commands/create/command.ts',
      dependencies: [
        { resolved: 'packages/cli/src/shared/paths.ts' },
        { resolved: 'packages/preset/src/index.ts' },
      ],
    },
    {
      source: 'packages/cli/src/shared/paths.ts',
      dependencies: [{ resolved: 'fs' }, { resolved: 'node_modules/.bun/citty/index.js' }],
    },
    { source: 'packages/preset/src/index.ts', dependencies: [] },
  ],
};

describe('the architecture skeleton', () => {
  it('given modules in two packages, then each package renders as a container heading', () => {
    const skeleton = renderSkeleton(graph);

    expect(skeleton).toContain('## packages/cli');
    expect(skeleton).toContain('## packages/preset');
  });

  it('given a module two directories under src, then its component sits at the segment level', () => {
    expect(renderSkeleton(graph)).toContain('### packages/cli commands/create');
  });

  it('given a module directly under src, then it lands in the root component', () => {
    expect(renderSkeleton(graph)).toContain('### packages/preset root');
  });

  it('given a rendered skeleton, then it opens with reference frontmatter', () => {
    expect(renderSkeleton(graph).startsWith('---\ncategory: reference\n---\n')).toBe(true);
  });
});

describe('skeleton edges', () => {
  it('given a workspace dependency, then the component links to the target anchor', () => {
    const skeleton = renderSkeleton(graph);

    expect(skeleton).toContain('- [packages/cli shared]' + '(#packagescli-shared)');
    expect(skeleton).toContain('- [packages/preset root]' + '(#packagespreset-root)');
  });

  it('given only external dependencies, then the component depends on nothing inside the workspace', () => {
    const external = renderSkeleton(graph).split('### packages/cli shared')[1]?.split('###')[0];

    expect(external).toContain('Depends on nothing inside the workspace.');
  });

  it('given a dependency inside the same component, then no self edge renders', () => {
    const selfReferential = {
      modules: [
        {
          source: 'packages/cli/src/shared/a.ts',
          dependencies: [{ resolved: 'packages/cli/src/shared/b.ts' }],
        },
        { source: 'packages/cli/src/shared/b.ts', dependencies: [] },
      ],
    };

    expect(renderSkeleton(selfReferential)).not.toContain('- [packages/cli shared]');
  });

  it('given a rendered skeleton, then every edge points at an anchor it declares', () => {
    const skeleton = renderSkeleton(graph);
    const anchors = headingAnchors(skeleton);
    const targets = [...skeleton.matchAll(/\]\(#([^)]+)\)/gu)].map((match) => match[1]);

    expect(targets.length).toBeGreaterThan(0);

    for (const target of targets) {
      expect(anchors).toContain(target);
    }
  });
});

describe('skeleton hygiene', () => {
  it('given a test module, then the skeleton leaves it out', () => {
    const withTest = {
      modules: [
        ...graph.modules,
        { source: 'packages/cli/src/commands/create/command.test.ts', dependencies: [] },
      ],
    };

    expect(renderSkeleton(withTest)).toBe(renderSkeleton(graph));
  });

  it('given a module outside src, then the skeleton leaves it out', () => {
    const withConfig = {
      modules: [
        ...graph.modules,
        { source: 'packages/cli/vitest.config.ts', dependencies: [] },
        { source: 'packages/cli/scripts/generate.ts', dependencies: [] },
      ],
    };

    expect(renderSkeleton(withConfig)).toBe(renderSkeleton(graph));
  });

  it('given the same graph in any module order, then the skeleton renders identically', () => {
    const reversed = { modules: [...graph.modules].reverse() };

    expect(renderSkeleton(reversed)).toBe(renderSkeleton(graph));
  });
});

describe('heading anchors', () => {
  it('given headings with slashes and spaces, then anchors slug the GitHub way', () => {
    const anchors = headingAnchors('## packages/cli\n\n### packages/cli commands/create\n');

    expect(anchors).toEqual(['packagescli', 'packagescli-commandscreate']);
  });
});

describe('the dependency graph codec', () => {
  it('given depcruise JSON output, then modules and resolved edges come through', () => {
    const parsed = parseDependencyGraph(JSON.stringify(graph));

    expect(parsed.modules).toHaveLength(3);
    expect(parsed.modules[0]?.dependencies[0]?.resolved).toBe('packages/cli/src/shared/paths.ts');
  });

  it('given output without a modules list, then parsing fails naming the shape', () => {
    expect(() => parseDependencyGraph('{}')).toThrow(/modules/u);
  });
});
