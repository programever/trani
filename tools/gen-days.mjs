// Collects days/*.json into src/days.generated.ts, so the page carries the plan with it (it works offline, like
// before). Run by "npm run check" and "npm run build". The file is not in git.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const files = readdirSync('days').filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
const recipes = files.map(f => JSON.parse(readFileSync(`days/${f}`, 'utf8')));
files.forEach((f, i) => {
  if (recipes[i].date !== f.slice(0, 10)) throw new Error(`days/${f}: the date inside is ${recipes[i].date}`);
});
writeFileSync('src/days.generated.ts',
  '// Made by tools/gen-days.mjs from days/*.json. Do not edit; not in git.\n' +
  "import type { Recipe } from './plan.ts';\n" +
  `export const RECIPES: Recipe[] = ${JSON.stringify(recipes)};\n`);
console.log(`days.generated.ts: ${files.length} days, ${files[0] ?? '-'} to ${files.at(-1) ?? '-'}`);
