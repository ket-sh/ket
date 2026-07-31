import { describe, expect, it } from 'vitest';

import { writesOf } from './command-writes.ts';

function paths(command: string): string[] | undefined {
  const writes = writesOf(command);

  return 'paths' in writes ? writes.paths : undefined;
}

function unreadable(command: string): string | undefined {
  const writes = writesOf(command);

  return 'unreadable' in writes ? writes.unreadable : undefined;
}

describe('a command that only reads', () => {
  it('writes nothing, whatever it reads', () => {
    for (const command of [
      'cat src/auth.ts',
      'grep -rn hello src',
      'ls -la src',
      'bun run test',
      'git status',
      'git diff HEAD',
      'rg --files',
    ]) {
      expect({ command, paths: paths(command) }).toStrictEqual({ command, paths: [] });
    }
  });

  it('reads a file whose name a quote makes look like a redirect', () => {
    expect(paths('grep ">" src/auth.ts')).toStrictEqual([]);
  });

  it('sends output nowhere without calling that a write of the source', () => {
    expect(paths('bun run test > /dev/null 2>&1')).toStrictEqual(['/dev/null']);
  });
});

describe('a command that redirects into a file', () => {
  it('names the file a truncating redirect writes', () => {
    expect(paths("printf 'x' > src/auth.ts")).toStrictEqual(['src/auth.ts']);
  });

  it('names the file an appending redirect writes', () => {
    expect(paths('echo x >> src/auth.ts')).toStrictEqual(['src/auth.ts']);
  });

  it('reads a redirect with no space before the file', () => {
    expect(paths('echo x >src/auth.ts')).toStrictEqual(['src/auth.ts']);
  });

  it('reads a redirect written against the word before it, as a shell does', () => {
    expect(paths('printf x>src/auth.ts')).toStrictEqual(['src/auth.ts']);
  });

  it('reads a redirect of a numbered descriptor', () => {
    expect(paths('bun run test 2> src/failures.log')).toStrictEqual(['src/failures.log']);
  });

  it('names nothing for a redirect with no file after it', () => {
    expect(paths('printf x >')).toStrictEqual([]);
  });

  it('names every file a chain of commands writes', () => {
    expect(paths('printf a > src/one.ts; printf b > src/two.ts')).toStrictEqual([
      'src/one.ts',
      'src/two.ts',
    ]);
  });

  it('reads a command that trails off after a separator', () => {
    expect(paths('printf a > src/one.ts &&')).toStrictEqual(['src/one.ts']);
  });

  it('names a file written on the far side of an and', () => {
    expect(paths('bun run test && printf a > src/auth.ts')).toStrictEqual(['src/auth.ts']);
  });

  it('names a file written at the end of a pipe', () => {
    expect(paths('cat src/one.ts | tr a b > src/two.ts')).toStrictEqual(['src/two.ts']);
  });
});

describe('a heredoc, which is how a shell writes a whole file', () => {
  it('names the file the redirect writes and reads nothing out of the body', () => {
    const command = "cat > src/auth.ts <<'EOF'\nexport const ratio = 1 > 0;\ncp a b\nEOF";

    expect(paths(command)).toStrictEqual(['src/auth.ts']);
  });

  it('reads the commands that follow the body, since the body ended', () => {
    const command = "cat > src/one.ts <<'EOF'\nhello\nEOF\nprintf b > src/two.ts";

    expect(paths(command)).toStrictEqual(['src/one.ts', 'src/two.ts']);
  });

  it('finds the delimiter when a space separates it from the marker', () => {
    const command = "cat > src/one.ts << 'EOF'\ncp a b\nEOF\nprintf b > src/two.ts";

    expect(paths(command)).toStrictEqual(['src/one.ts', 'src/two.ts']);
  });

  it('closes on the delimiter however the body indented it', () => {
    const command = "cat > src/one.ts <<'EOF'\ncp a b\n  EOF\nprintf b > src/two.ts";

    expect(paths(command)).toStrictEqual(['src/one.ts', 'src/two.ts']);
  });

  it('names no delimiter for a marker with nothing after it, and reads on', () => {
    expect(paths('cat > src/one.ts <<\nprintf b > src/two.ts')).toStrictEqual([
      'src/one.ts',
      'src/two.ts',
    ]);
  });

  it('reads a body the shell strips leading tabs from', () => {
    const command = 'cat > src/one.ts <<-EOF\ncp a b\nEOF\nprintf b > src/two.ts';

    expect(paths(command)).toStrictEqual(['src/one.ts', 'src/two.ts']);
  });
});

describe('a command that writes through a tool rather than a redirect', () => {
  it('names what tee is told to write', () => {
    expect(paths('echo x | tee src/auth.ts')).toStrictEqual(['src/auth.ts']);
  });

  it('reads a quoted argument as an argument, whatever punctuation it holds', () => {
    expect(paths('echo x | tee "a;b" src/auth.ts')).toStrictEqual(['a;b', 'src/auth.ts']);
    expect(paths("echo x | tee 'a;b' src/auth.ts")).toStrictEqual(['a;b', 'src/auth.ts']);
  });

  it('names every file tee appends to', () => {
    expect(paths('echo x | tee -a src/one.ts src/two.ts')).toStrictEqual([
      'src/one.ts',
      'src/two.ts',
    ]);
  });

  it('names where a copy lands, and not what it read', () => {
    expect(paths('cp /tmp/draft.ts src/auth.ts')).toStrictEqual(['src/auth.ts']);
  });

  it('names both ends of a move, since the source stops existing', () => {
    expect(paths('mv src/old.ts src/new.ts')).toStrictEqual(['src/old.ts', 'src/new.ts']);
  });

  it('names where an install lands', () => {
    expect(paths('install -m 644 /tmp/draft.ts src/auth.ts')).toStrictEqual(['src/auth.ts']);
  });

  it('names what an in-place edit rewrites', () => {
    expect(paths("sed -i 's/a/b/' src/auth.ts")).toContain('src/auth.ts');
  });

  it('names nothing for an edit that only prints', () => {
    expect(paths("sed 's/a/b/' src/auth.ts")).toStrictEqual([]);
  });

  it('reads an in-place edit that keeps a backup', () => {
    expect(paths("sed -i.bak 's/a/b/' src/auth.ts")).toContain('src/auth.ts');
  });

  it('drops the empty argument an in-place edit takes on some systems', () => {
    expect(paths("sed -i '' 's/a/b/' src/auth.ts")).toStrictEqual(['s/a/b/', 'src/auth.ts']);
  });

  it('reads a flag that starts like an in-place edit on a command that is not one', () => {
    expect(paths('cp -i /tmp/draft.ts src/auth.ts')).toStrictEqual(['src/auth.ts']);
  });

  it('names what a file creation touches', () => {
    expect(paths('touch src/auth.ts')).toStrictEqual(['src/auth.ts']);
  });

  it('names what a removal takes away', () => {
    expect(paths('rm -f src/auth.ts')).toStrictEqual(['src/auth.ts']);
  });

  it('names a file once, however many times the command names it', () => {
    expect(paths('printf a > src/auth.ts; printf b >> src/auth.ts')).toStrictEqual(['src/auth.ts']);
  });
});

describe('a command that both writes a file and redirects its output', () => {
  it('reads a path quoted in part as the one path it is', () => {
    expect(paths('printf x > "src/my file".ts')).toStrictEqual(['src/my file.ts']);
  });

  it('keeps the redirect out of the arguments, so the copy still lands where it lands', () => {
    expect(paths('cp /tmp/draft.ts src/auth.ts > src/copy.log')).toStrictEqual([
      'src/copy.log',
      'src/auth.ts',
    ]);
  });

  it('reads what follows the file a redirect named, since only that one is taken', () => {
    expect(paths('cp /tmp/draft.ts > src/copy.log src/auth.ts')).toStrictEqual([
      'src/copy.log',
      'src/auth.ts',
    ]);
  });

  it('keeps the argument a redirect was written against, since only the operator breaks', () => {
    expect(paths('echo x | tee notes>src/auth.ts')).toStrictEqual(['src/auth.ts', 'notes']);
  });

  it('reads a redirect written without a space as one word, not two', () => {
    expect(paths('cp /tmp/draft.ts >src/copy.log src/auth.ts')).toStrictEqual([
      'src/copy.log',
      'src/auth.ts',
    ]);
  });

  it('reads an argument that merely ends in a redirect character', () => {
    expect(paths('tee "notes>" src/auth.ts')).toStrictEqual(['notes>', 'src/auth.ts']);
  });
});

describe('every spelling of an inline script', () => {
  it('refuses each flag that hands a runtime a script rather than a file', () => {
    for (const flag of ['-c', '-e', '--eval']) {
      const command = `node ${flag} "x"`;

      expect({ command, part: unreadable(command) }).toStrictEqual({
        command,
        part: `node ${flag}`,
      });
    }
  });
});

describe('a command ket cannot read', () => {
  it('refuses to guess at an inline script, whichever runtime holds it', () => {
    for (const runtime of [
      'sh',
      'bash',
      'zsh',
      'node',
      'bun',
      'deno',
      'python',
      'python3',
      'ruby',
      'perl',
    ]) {
      const command = `${runtime} -c "open('src/auth.ts','w')"`;

      expect({ command, part: unreadable(command) }).toStrictEqual({
        command,
        part: `${runtime} -c`,
      });
    }
  });

  it('names the part it could not read', () => {
    expect(unreadable('python -c "print(1)"')).toBe('python -c');
  });

  it('reads a flag that means a script to a runtime and a pattern to a search', () => {
    expect(unreadable('grep -e hello src/auth.ts')).toBeUndefined();
    expect(paths('grep -e hello src/auth.ts')).toStrictEqual([]);
  });

  it('finds an inline script wherever in the chain it sits', () => {
    expect(unreadable('cat src/one.ts && python -c "print(1)"')).toBe('python -c');
  });

  it('reads a runtime that was handed a file rather than a script', () => {
    expect(unreadable('node build.js')).toBeUndefined();
    expect(unreadable('bun run test')).toBeUndefined();
  });

  it('refuses a write whose directory a change of directory moved', () => {
    expect(unreadable('cd src && printf a > auth.ts')).toBe('cd');
  });

  it('reads a change of directory that writes nothing', () => {
    expect(unreadable('cd src && cat auth.ts')).toBeUndefined();
    expect(paths('cd src && cat auth.ts')).toStrictEqual([]);
  });
});
