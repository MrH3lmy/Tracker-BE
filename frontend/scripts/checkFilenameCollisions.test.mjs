import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findFilenameCollisions } from './checkFilenameCollisions.mjs';

/**
 * The checker guards against a collision that CI's own Linux filesystem cannot reproduce, so the
 * detector itself is exercised against a fixture tree here - a silently broken checker would look
 * exactly like a clean repository.
 */
describe('findFilenameCollisions', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'filename-collisions-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const write = (relativePath) => {
    const absolute = join(root, relativePath);
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, '');
  };

  it('flags stems that differ only by case across extensions', () => {
    // The exact shape of the macOS white-page bug: an extensionless import of './TaskSavedViews'
    // picks up the lowercase `.ts` helper on a case-insensitive filesystem.
    write('components/TaskSavedViews.tsx');
    write('components/taskSavedViews.ts');

    expect(findFilenameCollisions(root)).toEqual([
      { directory: 'components', stem: 'tasksavedviews', names: ['TaskSavedViews.tsx', 'taskSavedViews.ts'] },
    ]);
  });

  it('flags a directory colliding with a sibling file stem', () => {
    write('Utils.ts');
    write('utils/index.ts');

    expect(findFilenameCollisions(root)).toEqual([
      { directory: '.', stem: 'utils', names: ['Utils.ts', 'utils'] },
    ]);
  });

  it('accepts a component and its stylesheet sharing one stem', () => {
    write('components/CodePreview.tsx');
    write('components/CodePreview.css');
    write('components/CodePreview.module.css');

    expect(findFilenameCollisions(root)).toEqual([]);
  });

  it('accepts stems that differ by more than case', () => {
    write('components/TaskSavedViews.tsx');
    write('components/savedTaskViews.ts');

    expect(findFilenameCollisions(root)).toEqual([]);
  });

  it('ignores node_modules and build output', () => {
    write('node_modules/pkg/Thing.ts');
    write('node_modules/pkg/thing.ts');
    write('dist/Bundle.js');
    write('dist/bundle.js');

    expect(findFilenameCollisions(root)).toEqual([]);
  });

  it('reports the real src tree as clean', () => {
    expect(findFilenameCollisions('src')).toEqual([]);
  });
});
