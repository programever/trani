// Writes the recipe files of the plan: days/<date>.json for every date from the start of the plan to today + 7,
// never past the race. Run every morning by trani.timer (tools/daily.sh), or by hand:
//   node tools/next-day.ts            write what is missing or not fixed yet
//   node tools/next-day.ts --dry-run  only say what would change
// A past day and a locked day (locked: true in the file) are never rewritten; today is not rewritten once it is
// marked done. The done days and how they felt are read from Firestore: the same data the page shows.
process.env.TZ = 'Asia/Ho_Chi_Minh';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as P from '../src/plan.ts';
import { decide, generate, type Ctx } from '../src/generate.ts';

const DIR = fileURLToPath(new URL('../days/', import.meta.url));
const FIRESTORE = 'https://firestore.googleapis.com/v1/projects/habits-433f8/databases/(default)/documents/trani';

interface Doc { name: string; fields?: { feel?: { stringValue?: string } } }

/** The done days and their feel, read from Firestore without a login (the rules allow reading). */
async function readCtx(): Promise<Ctx> {
  const done = new Set<P.DayKey>();
  const feels = new Map<P.DayKey, P.Feel>();
  let token = '';
  do {
    const res = await fetch(`${FIRESTORE}?pageSize=300${token ? '&pageToken=' + token : ''}`);
    if (!res.ok) throw new Error(`Firestore answered ${res.status}`);
    const body = await res.json() as { documents?: Doc[]; nextPageToken?: string };
    for (const d of body.documents ?? []) {
      const key = d.name.slice(d.name.lastIndexOf('/') + 1);
      if (!P.isDayKey(key)) continue;
      done.add(key);
      const f = d.fields?.feel?.stringValue;
      if (P.isFeel(f)) feels.set(key, f);
    }
    token = body.nextPageToken ?? '';
  } while (token);
  return { done, feels };
}

const dry = process.argv.includes('--dry-run');
const ctx = await readCtx();
const todayKey = P.today();
const last = [P.addDays(todayKey, P.AHEAD), P.RACE].sort()[0]!;
mkdirSync(DIR, { recursive: true });
let changed = 0;
for (let d = P.START; d <= last; d = P.addDays(d, 1)) {
  const file = DIR + d + '.json';
  const existing = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as P.Recipe : null;
  if (decide(d, todayKey, existing, ctx) === 'keep') continue;
  const r = generate(d, ctx);
  if (existing && JSON.stringify(existing) === JSON.stringify(r)) continue;
  changed++;
  console.log(`${dry ? 'would write' : 'write'} ${d}: ${P.expand(r).title}${r.why ? ' — ' + r.why : ''}`);
  if (!dry) writeFileSync(file, JSON.stringify(r, null, 2) + '\n');
}
console.log(`today ${todayKey}, ${ctx.done.size} done days, ${ctx.feels.size} with a feel; ` +
  (changed ? `${changed} day(s) ${dry ? 'would change' : 'written'}` : 'nothing to change'));
