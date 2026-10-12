// Auto-deploy: watches the project and, once your edits have been quiet for a while,
// checks the code, commits it and pushes to GitHub. Render redeploys on every push.
//
//   node scripts/auto-deploy.js            (auto-deploy.bat runs this)
//   node scripts/auto-deploy.js --dry-run  (check and report, but never commit or push)
//
// .env files, node_modules and build output are never uploaded: they are in .gitignore.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const QUIET_SECONDS = Number(process.env.AUTO_DEPLOY_QUIET_SECONDS) || 60; // wait this long after the last edit
const POLL_SECONDS = 10;

const log = (msg) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', ...opts });
  return { ok: res.status === 0, out: `${res.stdout || ''}${res.stderr || ''}`.trim() };
}
const git = (...args) => run('git', args);

// The index's tree id captures the exact content of every non-ignored file,
// so it changes whenever anything is edited, added or deleted.
function snapshot() {
  git('add', '-A');
  return git('write-tree').out;
}

function changedFiles() {
  return git('diff', '--cached', '--name-only').out.split(/\r?\n/).filter(Boolean);
}

function check(files) {
  if (files.some((f) => f.startsWith('client/'))) {
    log('Checking website code (TypeScript)...');
    const tsc = run('npx tsc -b', [], { cwd: path.join(ROOT, 'client'), shell: true });
    if (!tsc.ok) return `Website code has errors:\n${tsc.out}`;
  }
  for (const f of files.filter((f) => f.startsWith('server/') && f.endsWith('.js') && fs.existsSync(path.join(ROOT, f)))) {
    const syntax = run(process.execPath, ['--check', f]);
    if (!syntax.ok) return `Server file ${f} has a syntax error:\n${syntax.out}`;
  }
  return null;
}

function push() {
  let res = git('push');
  if (res.ok) return true;
  // Someone else (e.g. a groupmate) pushed first: bring in their commits, then try again.
  log('GitHub has newer commits; pulling them in first...');
  const pull = git('pull', '--rebase', '--autostash');
  if (!pull.ok) {
    git('rebase', '--abort');
    log(`Could not combine your changes with GitHub's automatically (conflict).\n${pull.out}\nResolve it with "git pull", then auto-deploy continues.`);
    return false;
  }
  res = git('push');
  if (!res.ok) log(`Push failed:\n${res.out}`);
  return res.ok;
}

function deploy() {
  const files = changedFiles();
  const problem = check(files);
  if (problem) {
    log(`${problem}\nNot deployed. Fix the error and save; auto-deploy will try again.`);
    return;
  }
  const summary = files.length <= 3 ? files.join(', ') : `${files.slice(0, 3).join(', ')} and ${files.length - 3} more`;
  if (DRY_RUN) { log(`[dry run] Checks passed. Would deploy: ${summary}`); return; }
  const commit = git('commit', '-q', '-m', `Auto-deploy: ${summary}`);
  if (!commit.ok) { log(`Commit failed:\n${commit.out}`); return; }
  log(`Committed: ${summary}. Uploading to GitHub...`);
  if (push()) log('Uploaded. Render is rebuilding the live site (usually live in 3-5 minutes).');
}

let lastTree = null;
let quietSince = 0;
let handledTree = null; // a tree already deployed or rejected, so it isn't retried until it changes

function tick() {
  if (fs.existsSync(path.join(ROOT, '.git', 'rebase-merge')) || fs.existsSync(path.join(ROOT, '.git', 'MERGE_HEAD'))) return;
  const tree = snapshot();
  const head = git('rev-parse', 'HEAD^{tree}').out;
  if (tree === head) { lastTree = tree; handledTree = null; return; }
  if (tree !== lastTree) {
    log(`${lastTree === null ? 'Found changes not yet deployed' : 'Changes detected'}. Deploying after ${QUIET_SECONDS}s without further edits...`);
    lastTree = tree;
    quietSince = Date.now();
    return;
  }
  if (tree === handledTree || Date.now() - quietSince < QUIET_SECONDS * 1000) return;
  handledTree = tree;
  deploy();
}

if (!git('rev-parse', '--is-inside-work-tree').ok) {
  console.error('This folder is not a git repository. Auto-deploy needs the project cloned from GitHub.');
  process.exit(1);
}
log(`Auto-deploy is on${DRY_RUN ? ' (dry run: nothing will be uploaded)' : ''}. Watching for changes; deploys ${QUIET_SECONDS}s after your last edit.`);
log('Close this window to turn auto-deploy off.');
tick();
setInterval(tick, POLL_SECONDS * 1000);
