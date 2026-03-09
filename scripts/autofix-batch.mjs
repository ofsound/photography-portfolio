import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT_DIR = process.cwd();
const QUEUE_CONFIG = {
  batchSize: 5,
  queueRoot: path.join(ROOT_DIR, 'src'),
  progressFile: path.join(ROOT_DIR, '.svelte-autofix-progress.json'),
};

const VALID_STATUSES = [
  'pending',
  'done',
  'manual-review-needed',
  'skipped',
  'in_progress',
];

const [command = 'status', ...restArgs] = process.argv.slice(2);

const normalized = (value) => value.replaceAll(path.sep, '/');

const isTargetFile = (filePath) => {
  const normalizedPath = filePath.replaceAll(path.sep, '/');
  if (!normalizedPath.startsWith('src/')) return false;
  if (normalizedPath.endsWith('.svelte.ts')) return true;
  if (normalizedPath.endsWith('.svelte')) return true;
  return (
    normalizedPath.endsWith('.ts') && !normalizedPath.endsWith('.svelte.ts')
  );
};

const scanFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await scanFiles(fullPath);
      files.push(...nested);
      continue;
    }

    if (!entry.isFile()) continue;
    const relative = path.relative(ROOT_DIR, fullPath);
    const normalizedPath = normalized(relative);
    if (!isTargetFile(normalizedPath)) continue;
    files.push(normalizedPath);
  }
  return files;
};

const buildFileList = async () => {
  const files = await scanFiles(QUEUE_CONFIG.queueRoot);
  return files.sort((a, b) => a.localeCompare(b));
};

const defaultState = (files) => ({
  batchSize: QUEUE_CONFIG.batchSize,
  cursor: 0,
  files,
  statusByFile: Object.fromEntries(files.map((file) => [file, 'pending'])),
  lastBatch: [],
  updatedAt: new Date().toISOString(),
});

const readState = async () => {
  try {
    const raw = await readFile(QUEUE_CONFIG.progressFile, 'utf-8');
    const state = JSON.parse(raw);
    const files = await buildFileList();
    const statusByFile = {};
    for (const file of files) {
      const existing = state?.statusByFile?.[file];
      statusByFile[file] = VALID_STATUSES.includes(existing)
        ? existing
        : 'pending';
    }
    return {
      batchSize: Math.max(
        1,
        Number(state?.batchSize) || QUEUE_CONFIG.batchSize,
      ),
      cursor: Number.isFinite(state?.cursor)
        ? Math.max(0, Math.floor(state.cursor))
        : 0,
      files,
      statusByFile,
      lastBatch: Array.isArray(state?.lastBatch) ? state.lastBatch : [],
      updatedAt: new Date().toISOString(),
    };
  } catch {
    const files = await buildFileList();
    return defaultState(files);
  }
};

const writeState = async (state) => {
  const normalizedState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(
    QUEUE_CONFIG.progressFile,
    `${JSON.stringify(normalizedState, null, 2)}\n`,
  );
};

const getPendingFiles = (state) =>
  state.files.filter((file) => state.statusByFile[file] === 'pending');

const formatStatusLine = (state) => {
  const counts = state.files.reduce((acc, file) => {
    const status = state.statusByFile[file] ?? 'pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  return {
    total: state.files.length,
    done: counts.done || 0,
    pending: counts.pending || 0,
    manual: counts['manual-review-needed'] || 0,
    skipped: counts.skipped || 0,
    inProgress: counts.in_progress || 0,
  };
};

const printStatus = (state) => {
  const summary = formatStatusLine(state);
  console.log(`Total files: ${summary.total}`);
  console.log(`Done: ${summary.done}`);
  console.log(`Pending: ${summary.pending}`);
  console.log(`Manual review needed: ${summary.manual}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`In progress: ${summary.inProgress}`);

  const pending = getPendingFiles(state);
  if (!pending.length) {
    console.log('No pending files remain.');
    return;
  }

  const preview = pending.slice(state.cursor, state.cursor + state.batchSize);
  if (!preview.length) {
    console.log('No pending files remain in this cursor window.');
    return;
  }

  console.log(
    `Next suggested batch (${preview.length}/${state.batchSize}):\n${preview
      .map((file) => `- ${file}`)
      .join('\n')}`,
  );
};

const commandNext = async () => {
  const state = await readState();
  const pending = getPendingFiles(state);
  const nextBatch = pending.slice(state.cursor, state.cursor + state.batchSize);
  if (!nextBatch.length) {
    console.log('No pending files found in the current queue.');
    return;
  }

  for (const file of nextBatch) {
    state.statusByFile[file] = 'in_progress';
  }
  state.lastBatch = nextBatch;
  state.cursor += nextBatch.length;
  await writeState(state);

  console.log(`\nNext batch (${nextBatch.length}/${state.batchSize}):`);
  for (const file of nextBatch) {
    console.log(file);
  }
  console.log('\nThen run Svelte MCP autofixer on each file above.');
  console.log(
    'After review, mark the batch with:\n  npm run autofix:queue:mark done -- <file1> <file2> ...',
  );
  console.log(
    '\nTip: mark the last fetched batch without retyping:\n  npm run autofix:queue:mark done -- --last-batch',
  );
};

const commandStatus = async () => {
  const state = await readState();
  printStatus(state);
};

const commandReset = async () => {
  const files = await buildFileList();
  const state = defaultState(files);
  await writeState(state);
  console.log(`Reset queue with ${files.length} files.`);
  console.log(
    `Progress file: ${path.relative(ROOT_DIR, QUEUE_CONFIG.progressFile)}`,
  );
};

const commandMark = async () => {
  const statusArg = restArgs[0];
  const allowedStatuses = [
    'done',
    'manual-review-needed',
    'skipped',
    'pending',
    'in_progress',
  ];
  const status = allowedStatuses.includes(statusArg) ? statusArg : null;
  const fileArgs = status ? restArgs.slice(1) : [];
  const markLastBatch = fileArgs.includes('--last-batch');
  const targets = markLastBatch
    ? []
    : fileArgs.filter((value) => value !== '--last-batch');

  if (!status) {
    if (!restArgs.length) {
      console.error(
        'Usage: node scripts/autofix-batch.mjs mark <done|manual-review-needed|skipped|pending> <file1> <file2> ...',
      );
      process.exitCode = 1;
      return;
    }
    console.error(
      'Invalid status. Expected done | manual-review-needed | skipped | pending | in_progress',
    );
    process.exitCode = 1;
    return;
  }

  const state = await readState();
  const finalTargets = targets.length
    ? targets
    : markLastBatch
      ? state.lastBatch
      : [];
  if (!finalTargets.length) {
    console.error('No files provided and no previous batch exists.');
    process.exitCode = 1;
    return;
  }

  for (const target of finalTargets) {
    if (!(target in state.statusByFile)) {
      console.error(`Unknown file: ${target}`);
      process.exitCode = 1;
      return;
    }
    state.statusByFile[target] = status;
    console.log(`Marked ${target} -> ${status}`);
  }

  await writeState(state);
};

const run = async () => {
  switch (command) {
    case 'next': {
      await commandNext();
      break;
    }
    case 'status': {
      await commandStatus();
      break;
    }
    case 'reset': {
      await commandReset();
      break;
    }
    case 'mark': {
      await commandMark();
      break;
    }
    default: {
      console.error(
        `Unknown command: ${command}\n\nAvailable commands: next, status, reset, mark`,
      );
      process.exitCode = 1;
    }
  }
};

run();
