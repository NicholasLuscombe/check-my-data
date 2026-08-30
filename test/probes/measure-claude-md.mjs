/* Measure CLAUDE.md's composition and emit docs/shared/CLAUDE-MD-CLASSIFICATION.md.
   READ-ONLY. Nothing is deleted, moved, rewritten or proposed for deletion, and
   neither CLAUDE.md nor any src/ file is modified.

   Re-runnable: CLAUDE.md only ever grows, so this is a standing instrument
   rather than a one-session artefact. Re-run it and the totals move; the
   classification in `claude-md-classes.json` is keyed by unit index and must be
   re-checked whenever units are added or reordered — the tool refuses to emit
   if the two disagree on unit count.

   THE SUBJECT IS GITIGNORED. `.gitignore:41` covers CLAUDE.md, so this record is
   tracked while the file it measures is not. Anyone without the working copy
   can read the classification and cannot reproduce it.

   Structural units. In every section over 2 KB, a unit starts at a non-indented,
   non-blank, non-heading line outside a fenced block and runs through its
   indented children. In Architecture and Active Conventions that is one
   top-level bullet; in Validation it is one bolded paragraph; in Session
   close-out it is one numbered step or trailing paragraph.

   Run: node test/probes/measure-claude-md.mjs
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SUBJECT = resolve(ROOT, 'CLAUDE.md');
const CLASSES = resolve(ROOT, 'test/probes/claude-md-classes.json');
const OUT = resolve(ROOT, 'docs/shared/CLAUDE-MD-CLASSIFICATION.md');
const CLASS_ORDER = ['convention', 'specification', 'finding', 'unclear'];

const RAW = readFileSync(SUBJECT, 'utf-8');
const L = RAW.split('\n');
const B = (s) => Buffer.byteLength(s, 'utf8');

// ── sections ──
const secs = [];
L.forEach((l, i) => { if (/^## /.test(l)) secs.push({ name: l.slice(3).trim(), line: i + 1 }); });
secs.forEach((s, i) => { s.end = i + 1 < secs.length ? secs[i + 1].line - 1 : L.length; });
for (const s of secs) { s.bytes = B(L.slice(s.line, s.end).join('\n')); s.nLines = s.end - s.line; }
const BIG = secs.filter(s => s.bytes > 2048);

// ── units ──
const units = [];
for (const s of BIG) {
  let fence = false, cur = null;
  for (let i = s.line; i < s.end; i++) {
    const l = L[i];
    if (/^\s*```/.test(l)) fence = !fence;
    if (!fence && l.trim() !== '' && !/^\s/.test(l) && !/^#/.test(l)) {
      if (cur) units.push(cur);
      cur = { section: s.name, line: i + 1, lines: [l] };
    } else if (cur) cur.lines.push(l);
  }
  if (cur) units.push(cur);
}
for (const u of units) {
  while (u.lines.length && u.lines[u.lines.length - 1].trim() === '') u.lines.pop();
  u.text = u.lines.join('\n');
  u.bytes = B(u.text);
  u.head = u.text.split('\n')[0].replace(/^[-\d.]+\s*/, '').replace(/\*\*/g, '').replace(/`/g, '').slice(0, 60).trim();
  u.markers = [...new Set(u.text.match(/\bS\d{2,3}\b/g) || [])];
  u.firstLineMarker = /\bS\d{2,3}\b/.test(u.text.split('\n')[0]);
  delete u.lines;
}

const CL = JSON.parse(readFileSync(CLASSES, 'utf-8'));
if (Object.keys(CL).length !== units.length) {
  console.error(`REFUSING TO EMIT: ${units.length} units parsed, ${Object.keys(CL).length} classified.\n` +
    'CLAUDE.md has changed since the classification was authored. Re-classify before re-running.');
  process.exit(2);
}
units.forEach((u, i) => { const c = CL[String(i)]; u.cls = c[0]; u.mixed = c[1]; u.note = c[2]; });

// ── docs/ references, and whether tracked ──
const tracked = new Set(execSync('git ls-files docs/', { cwd: ROOT, encoding: 'utf8' }).trim().split('\n'));
for (const u of units) {
  const hits = [...new Set(u.text.match(/docs\/[A-Za-z0-9_\-\/.]*\.md/g) || [])];
  u.docs = hits;
  u.docsTracked = hits.filter(h => tracked.has(h));
}

const sum = (a) => a.reduce((x, u) => x + u.bytes, 0);
const rows = [];
const w = (s = '') => rows.push(s);
const esc = (s) => String(s).replace(/\|/g, '\\|');
const pct = (n, d) => d ? (100 * n / d).toFixed(1) + '%' : '—';
const TOT = sum(units);

// ══════════════════════════════════════════════════════
w('# CLAUDE.md — a structural classification');
w('');
w('**This is a read.** Nothing is deleted, moved or rewritten, no line is proposed for deletion, and');
w('**no cut is recommended**. The output is a classification with sizes, so that a later cut can be');
w('priced and argued rather than guessed. `CLAUDE.md` itself is not modified — it is the subject, and');
w('appending a block about classifying it would change the thing being measured. No `src/` file is');
w('modified.');
w('');
w('**Generated** by `test/probes/measure-claude-md.mjs` from `test/probes/claude-md-classes.json`.');
w('Sizes, line numbers, markers and the document cross-reference are computed; the four-way class and');
w('the mixed flag are hand-authored judgements, keyed by unit index. The tool refuses to emit if the');
w('unit count has moved since the classification was written.');
w('');
w('**The subject is gitignored** (`.gitignore:41`), so this tracked record measures an untracked file.');
w('A reader without the working copy can read the classification and cannot reproduce it.');
w('');
w(`**Measured at commit \`${execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim()}\`.** \`CLAUDE.md\` is **${RAW.length.toLocaleString()} characters / ${B(RAW).toLocaleString()} bytes over ${L.length} lines** — ${Math.round(B(RAW) / L.length)} bytes a line.`);
w('');

// ── totals ──
w('## 1 — totals');
w('');
w('### 1.1 — by section');
w('');
w('| section | bytes | share | lines | units |');
w('|---|---|---|---|---|');
for (const s of secs) {
  const n = units.filter(u => u.section === s.name).length;
  w(`| ${esc(s.name)} | ${s.bytes.toLocaleString()} | ${pct(s.bytes, B(RAW))} | ${s.nLines} | ${n || '—'} |`);
}
w(`| **classified (sections over 2 KB)** | **${TOT.toLocaleString()}** | **${pct(TOT, B(RAW))}** | | **${units.length}** |`);
w('');
w(`Four sections exceed 2 KB. The other ${secs.length - BIG.length} together are ${(B(RAW) - BIG.reduce((a, s) => a + s.bytes, 0)).toLocaleString()} bytes.`);
w('');

w('### 1.2 — by class');
w('');
w('| class | units | bytes | share of classified | mean bytes |');
w('|---|---|---|---|---|');
for (const c of CLASS_ORDER) {
  const g = units.filter(u => u.cls === c);
  w(`| \`${c}\` | ${g.length} | ${sum(g).toLocaleString()} | ${pct(sum(g), TOT)} | ${g.length ? Math.round(sum(g) / g.length).toLocaleString() : '—'} |`);
}
w(`| **total** | **${units.length}** | **${TOT.toLocaleString()}** | | |`);
w('');

w('### 1.3 — by class, per section');
w('');
w('| section | ' + CLASS_ORDER.map(c => '`' + c + '`').join(' | ') + ' | total |');
w('|---|' + CLASS_ORDER.map(() => '---').join('|') + '|---|');
for (const s of BIG) {
  const g = units.filter(u => u.section === s.name);
  w(`| ${esc(s.name)} | ` + CLASS_ORDER.map(c => {
    const gg = g.filter(u => u.cls === c);
    return gg.length ? `${sum(gg).toLocaleString()} (${gg.length})` : '—';
  }).join(' | ') + ` | ${sum(g).toLocaleString()} (${g.length}) |`);
}
w('| **total** | ' + CLASS_ORDER.map(c => {
  const gg = units.filter(u => u.cls === c);
  return `**${sum(gg).toLocaleString()}** (${gg.length})`;
}).join(' | ') + ` | **${TOT.toLocaleString()}** (${units.length}) |`);
w('');

// ── mixed ──
const mixed = units.filter(u => u.mixed.length);
const pureFind = units.filter(u => u.cls === 'finding' && !u.mixed.includes('convention'));
const findAll = units.filter(u => u.cls === 'finding');
w('### 1.4 — mixed units, and the number a cut is actually priced against');
w('');
w('**A class is the unit\'s dominant function, not its only content.** The dominant shape in this file');
w('is a bullet that opens with one class and continues in another — a rule stated once, then several');
w('kilobytes of the measurement that produced it. The `mixed` column records the secondary class.');
w('');
w(`**${mixed.length} of ${units.length} units are mixed, carrying ${sum(mixed).toLocaleString()} bytes — ${pct(sum(mixed), TOT)} of the classified mass.**`);
w('');
w('The dispatch names the risk directly: *a wrong `finding` is how a load-bearing line gets deleted');
w('later*. So the figure that matters is not the `finding` total but the part of it that carries no');
w('instruction.');
w('');
w('| | units | bytes | share of classified |');
w('|---|---|---|---|');
w(`| all \`finding\` | ${findAll.length} | ${sum(findAll).toLocaleString()} | ${pct(sum(findAll), TOT)} |`);
w(`| … of which carry an embedded convention | ${findAll.length - pureFind.length} | ${(sum(findAll) - sum(pureFind)).toLocaleString()} | ${pct(sum(findAll) - sum(pureFind), TOT)} |`);
w(`| … **free of embedded instruction** | **${pureFind.length}** | **${sum(pureFind).toLocaleString()}** | **${pct(sum(pureFind), TOT)}** |`);
w('');
w(`**Only ${pureFind.length} of ${findAll.length} findings are free of embedded instruction, and they are ${sum(pureFind).toLocaleString()} bytes** — ${pct(sum(pureFind), sum(findAll))} of the finding mass and ${pct(sum(pureFind), TOT)} of the file's classified mass. Units ${pureFind.map(u => units.indexOf(u)).join(', ')}.`);
w('');
w('**How the flag was assigned, stated so it can be re-run or disputed.** A scan for');
w('imperative-shaped sentences over every `finding`, then a read of the matches. The scan over-fires');
w('on descriptive prose — unit 63\'s three matches are all descriptive and it stays unflagged — and');
w('under-fires on imperatives outside its verb list, which is how units 48 and 64 were initially');
w('missed. **The flag is a cut-pricing aid, not a reclassification**, and it was set by reading.');
w('');

// ── session markers ──
const anyM = units.filter(u => u.markers.length);
const headM = units.filter(u => u.firstLineMarker);
let lineM = 0, lineB = 0;
for (const l of L) if (/\bS\d{2,3}\b/.test(l)) { lineM++; lineB += B(l); }
const allMarkers = [...new Set(units.flatMap(u => u.markers))].sort((a, b) => +a.slice(1) - +b.slice(1));
w('### 1.5 — session markers');
w('');
w('**Three measures, because they answer three questions and differ by a factor of two.** State which');
w('one a figure is.');
w('');
w('| measure | count | bytes |');
w('|---|---|---|');
w(`| lines containing a marker | ${lineM} lines | ${lineB.toLocaleString()} |`);
w(`| units whose **first line** carries one | ${headM.length} units | ${sum(headM).toLocaleString()} |`);
w(`| units where **any line** carries one | ${anyM.length} units | ${sum(anyM).toLocaleString()} |`);
w('');
w(`The third is ${pct(sum(anyM), TOT)} of the classified mass: a unit counts in full when one sub-bullet in it carries a marker, which is common. **${allMarkers.length} distinct sessions are named**, from \`${allMarkers[0]}\` to \`${allMarkers[allMarkers.length - 1]}\`.`);
w('');
const big = [...units].sort((a, b) => b.bytes - a.bytes).slice(0, 10);
w('### 1.6 — the ten largest units');
w('');
w('| # | bytes | class | section | opening |');
w('|---|---|---|---|---|');
for (const u of big) w(`| ${units.indexOf(u)} | ${u.bytes.toLocaleString()} | \`${u.cls}\` | ${esc(u.section)} | ${esc(u.head)} |`);
w('');
w(`Those ten are ${sum(big).toLocaleString()} bytes — ${pct(sum(big), TOT)} of the classified mass in ${(100 * 10 / units.length).toFixed(1)}% of the units.`);
w('');

// ── the table ──
w('## 2 — the per-unit table');
w('');
w('`#` is the unit index the classification is keyed on. `line` is the line `CLAUDE.md` starts the');
w('unit at, at the commit named above. `mixed` names the secondary class where the unit carries');
w('substantial material of another.');
w('');
w('| # | section | line | bytes | class | mixed | marker | opening 60 chars | note |');
w('|---|---|---|---|---|---|---|---|---|');
for (const [i, u] of units.entries()) {
  w(`| ${i} | ${u.section === 'Active Conventions' ? 'Conv' : u.section === 'Architecture' ? 'Arch' : u.section === 'Session close-out' ? 'Close' : 'Valid'} | ${u.line} | ${u.bytes.toLocaleString()} | \`${u.cls}\` | ${u.mixed.length ? u.mixed.join(', ') : '—'} | ${u.markers[0] || '—'} | ${esc(u.head)} | ${esc(u.note) || ''} |`);
}
w('');

// ── check 1 ──
const withDocs = units.filter(u => u.docs.length);
const withTracked = units.filter(u => u.docsTracked.length);
w('## 3 — check one: does a unit duplicate a tracked `docs/shared/` document?');
w('');
w(`**${withDocs.length} units name a \`docs/\` markdown file in their own text, and they are ${sum(withDocs).toLocaleString()} bytes — ${pct(sum(withDocs), TOT)} of the classified mass.** ${withTracked.length} of them name a **tracked** document.`);
w('');
w('These are the cheapest possible relocations, because the unit has already named where its content');
w('lives. **This does not establish that the document says the same thing** — the check is that a');
w('committed home is named, not that the content is duplicated there. Verifying the overlap is a');
w('per-unit read and was not performed.');
w('');
w('| # | bytes | class | document named | tracked | opening |');
w('|---|---|---|---|---|---|');
for (const u of withDocs) {
  const i = units.indexOf(u);
  w(`| ${i} | ${u.bytes.toLocaleString()} | \`${u.cls}\` | ${esc(u.docs.slice(0, 2).map(d => '`' + d + '`').join(', '))}${u.docs.length > 2 ? ` +${u.docs.length - 2}` : ''} | ${u.docsTracked.length ? 'yes' : '**no**'} | ${esc(u.head)} |`);
}
w('');
const untrackedDocs = withDocs.filter(u => !u.docsTracked.length);
w(`**${untrackedDocs.length} name only an untracked or archived path** (units ${untrackedDocs.map(u => units.indexOf(u)).join(', ')}), so for those the named home is not itself in the repository and relocation would need one made first.`);
w('');

// ── check 2 ──
w('## 4 — check two: contradictions');
w('');
w('Reported as pairs with both line numbers. **Not resolved here.** Three of the four are');
w('*self-declared*: a later unit states in its own text that an earlier one is wrong, and neither was');
w('changed. That is what an append-only file produces.');
w('');
w('| # | pair | lines | what disagrees | status |');
w('|---|---|---|---|---|');
w('| C1 | 46 ↔ 48 | 302 ↔ 304 | Unit 46 gives the VST routing split as **13 TRANSFORMED + 14 RAW + 1 STRUCTURAL**. Unit 48 gives **13 + 15 + 1** and says *"this file\'s own \'Reconciled test-input routing\' line carries the same undercount"*. | self-declared, unreconciled |');
w('| C2 | 10 ↔ 87 | 73 ↔ 481 | Unit 10 lists **Selective Noise** on the sub-unit BH-FDR escalation roster. Unit 87 says *"Selective Noise is on the sub-unit escalation roster above and should not be … The roster line is stale, the code is not."* | self-declared, unreconciled |');
w('| C3 | 165 ↔ 51 | 650 ↔ 334 | Unit 165 says **three** finding templates take `toFileRow` and names them. Unit 51 says **five**, *"corrected S373 from an earlier count of three"*. **Settled at source: `keyFindingTemplates.js` has five** (`:190`, `:268`, `:361`, `:398`, `:447`). | self-declared **and** confirmed against `src/` |');
w('| C4 | 227 ↔ 213 | 808 ↔ 728 | Close-out step 2 gives the batch steady state as **"27/28, DS12b the sole failure"**. Unit 213 says the pass condition *"is not a count"* and that this phrasing *"describes the PRE-S384 runner and is stale as a pass criterion"*. | self-declared, unreconciled |');
w('');
w('**C1, C2 and C4 all point the same way**: the correcting unit was appended and the corrected unit');
w('was left in place, so both readings are live in a file read start to finish every session.');
w('');

// ── check 3 ──
w('## 5 — check three: staleness against `src/` as it stands');
w('');
w('Checked at source where the check is cheap. Where it is not, the row says `unverified` rather than');
w('guessing — the dispatch\'s instruction, and the honest answer for a claim whose verification is a');
w('multi-file read.');
w('');
w('| claim | unit | asserted | measured at source | verdict |');
w('|---|---|---|---|---|');
w('| `FISHER_EXEMPT` entries | 38 | 7 | 7 | **current** |');
w('| `MINIPLOT_REGISTRY` keys | 141 | 29 | 29 | **current** |');
w('| distinct MiniCard components | 141 | 28 | 28 `MiniCard_*.jsx` | **current** |');
w('| files in `src/tests/` | Directory Structure | 30 | 30 | **current** |');
w('| `ROW_SEMANTICS_FULL_SKIP` members | 5 | 5 | 5 | **current** |');
w('| `TEST_MECHANISM` keys | 166 | 29 (5 mechanism keys, 29 tests) | 29 | **current** |');
w('| templates taking `toFileRow` | 165 | three, named | **five**, named at `:190 :268 :361 :398 :447` | **STALE** |');
w('| tracked files in `test/probes/` | 99 | 75 *"at S351 open"* | 142 | **dated, not wrong** — the claim is anchored to S351 |');
w('| batch steady state | 220 | *"Post-S111 batch: 27/27 passed"* | 28 checks, 27 passed + 1 declared | **dated** — predates the S384 register |');
w('| VST routing split 13/14/1 | 46 | 14 RAW | not cheaply derivable from one grep | `unverified` — but see C1 |');
w('| Selective Noise sub-unit escalation | 10 | on the roster | `selectiveNoise.js` does call `bhFDR`, which does not settle whether it *escalates* | `unverified` — but see C2 |');
w('');
w('**One stale claim outside the classified sections**, reported because it was found while checking:');
w(`§What This Is says **167 modules**; \`find src -name '*.js' -o -name '*.jsx'\` returns **${execSync("find src -name '*.js' -o -name '*.jsx' | wc -l", { cwd: ROOT, encoding: 'utf8' }).trim()}**. That section is under 2 KB and is not a classified unit.`);
w('');
w('**Six of eleven checkable claims are current, one is stale, two are dated-but-anchored, and two');
w('could not be checked cheaply.** No conclusion is drawn from that ratio about the unchecked');
w('remainder: these are the claims that happened to be cheap to verify, not a sample of anything.');
w('');

// ── not settled ──
w('## 6 — what this record does not settle');
w('');
w('- **It does not decide what is cut.** No deletion list, no recommendation, no ranking by');
w('  removability. A cut is a separate decision taken against these numbers, and proposing one here');
w('  would price it before it was measured.');
w('- **It does not establish that any `finding` is safe to remove.** §1.4 is the reason: only');
w(`  ${pureFind.length} of ${findAll.length} findings carry no embedded instruction. A \`finding\` class means the unit's dominant`);
w('  function is evidence — not that removing it would cost nothing.');
w('- **The `unclear` rows are unclassified, not neutral.** Four units where the text alone does not say');
w('  what the reader is meant to do with it. They are not a residual bucket and they are not "probably');
w('  fine": they are the rows a cut must read before touching.');
w('- **The four-way class is a judgement, and a contestable one.** Sizes, line numbers, markers and the');
w('  document cross-reference are computed. The class and the mixed flag are not, and a second reader');
w('  would move some rows.');
w('- **Check one does not show duplication.** It shows that a unit names a committed document. Whether');
w('  the document already carries the content is a per-unit read that was not performed.');
w('- **Check two does not resolve any contradiction**, and check three does not say what a stale claim');
w('  should become. Both are reports.');
w('- **Two source checks are `unverified` and stay that way.** They are not "probably fine".');
w('- **Nothing about `STATUS.md`,** which has its own draining instruction and is a different file with');
w('  a different contract. This record makes no claim about it.');
w('- **Nothing about whether the file should be smaller.** That the growth is invisible from inside a');
w('  file that has only ever been appended to is a fact about its history, not an argument for a cut.');
w('');

writeFileSync(OUT, rows.join('\n').replace(/\n{3,}/g, '\n\n') + '\n');
console.log(`wrote ${OUT}`);
console.log(`lines: ${rows.join('\n').replace(/\n{3,}/g, '\n\n').split('\n').length}`);
