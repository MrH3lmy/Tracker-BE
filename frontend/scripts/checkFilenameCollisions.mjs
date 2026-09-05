#!/usr/bin/env node
/**
 * Fails the build when two entries in the same directory have names that differ only by letter
 * case - the one class of naming bug that a Linux CI runner cannot reproduce on its own.
 *
 * Why this exists: `TaskSavedViews.tsx` (the component) and `taskSavedViews.ts` (its helpers) once
 * lived side by side. On Linux an extensionless `import ... from './TaskSavedViews'` resolves
 * exactly as written, so CI stayed green. On a default macOS filesystem, which is
 * case-insensitive, Vite tries its resolve extensions in order - `.ts` before `.tsx` - and
 * `TaskSavedViews.ts` matches the lowercase helper file, so the import received a module with no
 * such export, React never mounted, and the app rendered a white page.
 *
 * Comparing stems rather than full filenames is deliberate: the collision above is between a
 * `.tsx` and a `.ts` file, so a full-filename comparison would miss it. It also means a legitimate
 * pair like `CodePreview.tsx` + `CodePreview.css` never trips the check, because those stems match
 * exactly instead of differing only by case.
 *
 * Run directly (`node scripts/checkFilenameCollisions.mjs`, or `npm run check:filenames`), or
 * import `findFilenameCollisions` from a test.
 */
import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', '.git']);

/** Strips the final extension only, so `Component.module.css` has the stem `Component.module`. */
const stemOf = (name) => name.replace(/\.[^.]+$/, '');

/**
 * @param {string} rootDir directory to walk recursively
 * @returns {{directory: string, stem: string, names: string[]}[]} one entry per colliding group,
 *   sorted for stable output; `directory` is relative to `rootDir`.
 */
export function findFilenameCollisions(rootDir) {
  const collisions = [];

  const walk = (absoluteDir) => {
    const entries = readdirSync(absoluteDir, { withFileTypes: true })
      .filter((entry) => !(entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)));

    /** @type {Map<string, Set<string>>} lowercased stem -> the spellings seen for it */
    const spellingsByStem = new Map();
    for (const entry of entries) {
      // A directory is a resolution target too (`./utils` can mean `utils/index.ts`), so it is
      // compared under its whole name rather than a stripped extension.
      const stem = entry.isDirectory() ? entry.name : stemOf(entry.name);
      const key = stem.toLowerCase();
      const spellings = spellingsByStem.get(key) ?? new Set();
      spellings.add(stem);
      spellingsByStem.set(key, spellings);
    }

    for (const [key, spellings] of spellingsByStem) {
      if (spellings.size < 2) continue;
      collisions.push({
        directory: relative(rootDir, absoluteDir) || '.',
        stem: key,
        names: entries
          .filter((entry) => (entry.isDirectory() ? entry.name : stemOf(entry.name)).toLowerCase() === key)
          .map((entry) => entry.name)
          .sort(),
      });
    }

    for (const entry of entries) {
      if (entry.isDirectory()) walk(join(absoluteDir, entry.name));
    }
  };

  walk(resolve(rootDir));
  return collisions.sort((a, b) => a.directory.localeCompare(b.directory) || a.stem.localeCompare(b.stem));
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const rootDir = process.argv[2] ?? 'src';
  const collisions = findFilenameCollisions(rootDir);

  if (collisions.length === 0) {
    console.log(`No case-only filename collisions in ${rootDir}/.`);
    process.exit(0);
  }

  console.error(`Case-only filename collisions found in ${rootDir}/:\n`);
  for (const { directory, names } of collisions) {
    console.error(`  ${directory}/: ${names.join(', ')}`);
  }
  console.error(
    '\nThese names differ only by letter case, so they resolve to different files on Linux than'
    + '\non a case-insensitive filesystem (the macOS default). Rename one of each pair so the stems'
    + '\ndiffer by more than case.',
  );
  process.exit(1);
}
