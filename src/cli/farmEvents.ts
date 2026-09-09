#!/usr/bin/env node
/// <reference types="node" />
import { spawnSync } from 'child_process';

const scripts = ['createFilters', 'createEvents', 'createSubEvents', 'mergeEvents', 'finalizeEvents', 'packEvents'];
const packedEventsPath = 'data/packedEvents.json';

function runGit(args: string[], options: { capture?: boolean } = {}) {
  return spawnSync('git', args, {
    encoding: options.capture ? 'utf8' : undefined,
    stdio: options.capture ? 'pipe' : 'inherit',
  });
}

function commitAndPushPackedEvents(): Error | null {
  const generatedPaths = [packedEventsPath, 'data/historic.json'];
  const pathArguments = ['--', ...generatedPaths];
  const status = runGit(['status', '--porcelain', ...pathArguments], { capture: true });
  if (status.error) return new Error(`Failed to check generated event files: ${status.error.message}`);
  if (status.status !== 0) return new Error(`Failed to check generated event files: git status exited with ${status.status ?? 1}.`);
  if (!String(status.stdout).trim()) {
    console.log('No changes in generated event files; skipping commit and push.');
    return null;
  }

  console.log(`\n> git add ${generatedPaths.join(' ')}`);
  const add = runGit(['add', ...generatedPaths]);
  if (add.error) return new Error(`Failed to stage generated event files: ${add.error.message}`);
  if (add.status !== 0) return new Error(`Failed to stage generated event files: git add exited with ${add.status ?? 1}.`);

  const staged = runGit(['diff', '--cached', '--quiet', ...pathArguments], { capture: true });
  if (staged.error) return new Error(`Failed to inspect staged event files: ${staged.error.message}`);
  if (staged.status === 0) {
    console.log('No staged changes in generated event files; skipping commit and push.');
    return null;
  }
  if (staged.status !== 1) return new Error(`Failed to inspect staged event files: git diff exited with ${staged.status ?? 1}.`);

  console.log(`\n> git commit ${generatedPaths.join(' ')}`);
  const commit = runGit(['commit', '-m', 'Update generated event data', ...pathArguments]);
  if (commit.error) return new Error(`Failed to commit generated event files: ${commit.error.message}`);
  if (commit.status !== 0) return new Error(`Failed to commit generated event files: git commit exited with ${commit.status ?? 1}.`);

  console.log('\n> git push');
  const push = runGit(['push']);
  if (push.error) return new Error(`Failed to push packed events commit: ${push.error.message}`);
  if (push.status !== 0) return new Error(`Failed to push packed events commit: git push exited with ${push.status ?? 1}.`);

  return null;
}

export function farmEvents(): Error | null {
  for (const script of scripts) {
    console.log(`\n> ${script}`);
    const result = spawnSync('npm', ['run', script], { stdio: 'inherit', shell: process.platform === 'win32' });

    if (result.error) return new Error(`Failed to run ${script}: ${result.error.message}`);

    if (result.status !== 0) {
      return new Error(`Aborting: ${script} failed with exit code ${result.status ?? 1}.`);
    }
  }

  return commitAndPushPackedEvents();
}

if (require.main === module) {
  const error = farmEvents();
  if (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
