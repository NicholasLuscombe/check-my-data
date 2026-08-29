// register-route.mjs — move long register-row bodies out of STATUS and into the
// docs/shared document each row already cites. Nothing is deleted: the body is
// appended to the document first, then the row is shortened to claim + pointer.
//
//   node register-route.mjs           plan only, writes nothing
//   node register-route.mjs --go      move
//
// Rationale: STATUS is gitignored and has no history, so a register row is the
// only copy of whatever it holds. A docs/shared file is tracked. Moving the body
// makes it recoverable and shortens the register at the same time.

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const GO = process.argv.includes('--go');
const MIN = Number((process.argv.find(a => a.startsWith('--min=')) ?? '').split('=')[1] || 500);
const STATUS = 'STATUS.md';
const SHARED = 'docs/shared';
const STAMP = 'S392';

const raw = readFileSync(STATUS, 'utf8');
const lines = raw.split('\n');

const cands = [];
lines.forEach((line, i) => {
  const m = line.match(/^\| \*?\*?P(\d+)\*?\*? \|/);
  if (!m) return;
  const parts = line.split('|');
  if (parts.length < 5) return;
  const state = parts[3];
  if (!/^\s*\*?\*?open/i.test(state.replace(/\*\*/g, ''))) return;
  if (state.length <= MIN) return;
  const docs = [...state.matchAll(/docs\/shared\/(\S+?\.md)/g)].map(x => x[1]);
  const target = docs.find(d => existsSync(join(SHARED, d)));
  if (!target) return;
  cands.push({ p: Number(m[1]), idx: i, line, parts, state, docs, target });
});

// keep the first sentence of the state cell, verbatim, plus any "allocated SNNN"
function shorten(c) {
  const s = c.state.trim();
  const cut = s.search(/(?<=\.)\s(?=[A-Z`*])/);
  let head = cut > 0 ? s.slice(0, cut) : s.slice(0, 240);
  const alloc = s.match(/allocated S\d+/);
  if (alloc && !head.includes(alloc[0])) head += ` ${alloc[0]}.`;
  const others = c.docs.filter(d => d !== c.target);
  const also = others.length ? ` Also \`docs/shared/${others.join('`, `docs/shared/')}\`.` : '';
  return ` ${head} **Body moved to \`docs/shared/${c.target}\` at ${STAMP}.**${also} `;
}

let shed = 0;
console.log(`candidates: ${cands.length}   (open, state cell over ${MIN} chars, cites an existing docs/shared file)\n`);
for (const c of cands) {
  c.newState = shorten(c);
  shed += c.state.length - c.newState.length;
  console.log(`  P${String(c.p).padEnd(4)} ${String(c.state.length).padStart(5)} -> ${String(c.newState.length).padStart(4)} chars   ${c.target}`);
  if (!GO) console.log(`         kept: ${c.newState.trim().slice(0, 150)}…\n`);
}
console.log(`\n  STATUS sheds ~${(shed / 1024).toFixed(1)} KB across ${cands.length} rows`);

const byDoc = {};
for (const c of cands) (byDoc[c.target] ??= []).push(c.p);
console.log(`  documents appended to: ${Object.keys(byDoc).length}`);
for (const [d, ps] of Object.entries(byDoc)) console.log(`    ${d}  <- ${ps.map(p => 'P' + p).join(', ')}`);

if (!GO) { console.log(`\nPlan only. Nothing written. Re-run with --go.`); process.exit(0); }

// ---- write ----
copyFileSync(STATUS, STATUS + '.pre-route');
console.log(`\nbackup: ${STATUS}.pre-route`);

for (const [doc, ps] of Object.entries(byDoc)) {
  const path = join(SHARED, doc);
  let body = readFileSync(path, 'utf8');
  if (!body.endsWith('\n')) body += '\n';
  body += `\n---\n\n## Register rows moved from STATUS, ${STAMP}\n\n`;
  body += `STATUS is gitignored and has no git history, so a register row is the only copy of\n`;
  body += `whatever it holds. These bodies are moved here verbatim; the register row keeps its\n`;
  body += `claim and points at this section.\n`;
  for (const p of ps) {
    const c = cands.find(x => x.p === p);
    body += `\n### P${p} — ${c.parts[2].trim()}\n\n${c.state.trim()}\n`;
  }
  writeFileSync(path, body);
  console.log(`  appended ${ps.length} row(s) to ${path}`);
}

for (const c of cands) {
  const parts = [...c.parts];
  parts[3] = c.newState;
  lines[c.idx] = parts.join('|');
}
writeFileSync(STATUS, lines.join('\n'));

const after = readFileSync(STATUS, 'utf8');
console.log(`\nSTATUS ${raw.length} -> ${after.length} bytes  (${((raw.length - after.length) / 1024).toFixed(1)} KB out)`);
const n = (after.match(/^\| \*?\*?P\d+/gm) || []).length;
console.log(`register rows after: ${n}  (must be unchanged)`);
console.log(`\nVerify, then commit the docs/shared changes. STATUS is gitignored — no commit.`);
