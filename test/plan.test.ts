// Tests for src/plan.ts and src/generate.ts. Run: node --test test/plan.test.ts
process.env.TZ = 'Asia/Ho_Chi_Minh';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import * as P from '../src/plan.ts';
import * as G from '../src/guide.ts';
import * as R from '../src/generate.ts';
import { GROUPS, VIDEOS } from '../src/videos.ts';
import { VOICE, VOICE_TEXT } from '../src/voice.ts';

/** Every date of the plan, made with nothing known about the past. */
const ALL = R.generateAll(P.START, P.RACE);
const plan = P.makePlan(ALL);
const allDays = (): string[] => [...plan.days.keys()];
const dayOf = (k: string): P.Day => { const d = plan.dayOf(k); assert.ok(d, 'no day ' + k); return d; };
const textOf = (d: P.Day): string => JSON.stringify(d);
const stepsOf = (d: P.Day): P.Step[] => d.sections.flatMap(s => s.items).flatMap(i => [...(i.steps ?? [])]);

test('dates of the plan', () => {
  assert.equal(P.weekday(P.START), 2, 'START (21 Oct 2026) is a Wednesday');
  assert.equal(P.weekday(P.RACE), 6, 'the race (27 Dec 2026) is a Sunday');
  assert.equal(P.daysBetween(P.START, P.RACE), 67);
  assert.equal(ALL.length, 68, 'one recipe per day, start to race');
  assert.deepEqual(P.windowKeys('2026-10-22'),
    ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'], 'today and the next 7 days');
  assert.equal(P.weekIndex('2026-10-19'), 0);
  assert.equal(P.weekIndex('2026-11-03'), 2);
  assert.equal(P.weekIndex(P.RACE), 9);
  assert.equal(R.generateAll('2026-12-25', '2027-01-05').length, 3, 'never past the race');
});

test('the 04:00 rule and day maths', () => {
  assert.equal(P.dayKey(new Date(2026, 9, 22, 1, 0)), '2026-10-21', '01:00 belongs to the day before');
  assert.equal(P.dayKey(new Date(2026, 9, 22, 4, 0)), '2026-10-22', '04:00 is the new day');
  assert.equal(P.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(P.weekStart('2026-10-25'), '2026-10-19', 'a Sunday belongs to the Monday before');
  assert.equal(P.dur(45), '45 phút');
  assert.equal(P.dur(90), '1 tiếng 30 phút');
  assert.equal(P.dur(120), '2 tiếng');
});

test('every day has morning, noon and evening, with times', () => {
  for (const k of allDays()) {
    const d = dayOf(k);
    assert.ok(d.title && d.week, k);
    if (k !== P.RACE) assert.deepEqual(d.sections.map(s => s.name), ['Sáng', 'Trưa', 'Tối'], k);
    for (const s of d.sections) {
      assert.ok(s.items.length > 0, `${k} ${s.name}`);
      for (const it of s.items) assert.ok(it.time && it.text && !it.text.includes('undefined'), `${k} ${it.text}`);
    }
    const eats = d.sections.flatMap(s => s.items).filter(i => i.tag === 'eat').length;
    assert.ok(eats >= 3, `${k}: at least 3 meals`);
  }
});

test('meals only say light or heavy, carbs or protein, never a dish (Iker, 2026-10-21)', () => {
  const dish = / (cơm|phở|bún|hủ tiếu|bánh|chuối|sữa|xôi|gel|khoai|trứng|thịt|gà|cá|bò|yến mạch|mật ong|trái cây) /i;
  const words = (t: string): string => ' ' + t.replace(/[,.:;()]/g, ' ').replace(/\s+/g, ' ') + ' ';
  for (const k of allDays()) {
    for (const it of dayOf(k).sections.flatMap(s => s.items).filter(i => i.tag === 'eat')) {
      assert.doesNotMatch(words(it.text + ' ' + (it.note ?? '')), dish, `${k} ${it.text}`);
      if (k !== P.RACE && it.text.startsWith('Ăn')) assert.match(it.text, /nhẹ|vừa|nặng/, `${k} ${it.text}`);
    }
  }
});

test('no gym: everything is done at home (Iker, 2026-10-21)', () => {
  for (const k of allDays()) assert.doesNotMatch(textOf(dayOf(k)), /gym|máy chạy/i, k);
  assert.match(dayOf('2026-11-07').title, /Chạy có dốc 2 tiếng/, 'Saturday week 2');
  assert.match(dayOf('2026-11-08').title, /Chạy dài 3 tiếng/, 'Sunday week 2');
  // morning runs: week 2 on Tuesday, Wednesday and Friday, never on Thursday
  const amRun = (k: string): boolean => dayOf(k).sections[0]!.items.some(i => i.tag === 'train');
  assert.deepEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'].map(amRun), [false, true, true, false, true]);
});

test('core is never in the same session as a run in the park (Iker, 2026-10-21)', () => {
  for (const k of allDays()) {
    for (const it of dayOf(k).sections.flatMap(s => s.items)) {
      if (/^Chạy/.test(it.text)) assert.ok(!it.steps?.some(x => /Plank|Dead Bug|Bird Dog|Glute Bridge/.test(x.name)), `${k} ${it.text}`);
    }
  }
  // Core in the morning, the run in the evening; never core after dinner.
  assert.match(JSON.stringify(dayOf('2026-10-22').sections[0]), /core ở nhà/);
  assert.match(JSON.stringify(dayOf('2026-12-23').sections[0]), /Core nhẹ ở nhà/);
  for (const k of allDays()) {
    for (const s of dayOf(k).sections) {
      const dinnerAt = s.items.findIndex(i => i.text.startsWith('Ăn tối'));
      if (dinnerAt >= 0) assert.ok(!s.items.slice(dinnerAt).some(i => i.steps?.some(x => /Plank/.test(x.name))), `${k}: core after dinner`);
    }
  }
});

test('every exercise at home has a detailed how-to', () => {
  for (const k of ['2026-10-23', '2026-11-02', '2026-11-04', '2026-11-06']) {
    const steps = stepsOf(dayOf(k));
    assert.ok(steps.length >= 5, k);
    for (const x of steps) {
      assert.ok(Array.isArray(x.note) && x.note.length >= (x.name === 'Khởi động' ? 2 : 3), `${k} ${x.name}`);
    }
  }
  // The trial of 23 Oct: one warm-up, 1 set each (Iker, 2026-10-22), no exercise twice.
  const names = stepsOf(dayOf('2026-10-23')).map(x => x.name);
  assert.equal(names.filter(n => n === 'Khởi động').length, 1);
  const vids = stepsOf(dayOf('2026-10-23')).map(x => x.video).filter(Boolean);
  assert.equal(new Set(vids).size, vids.length, 'no exercise twice on the trial day');
  assert.ok(stepsOf(dayOf('2026-10-23')).every(x => !x.dose || !/^[23] x/.test(x.dose)), '1 set each');
});

test('the normal week', () => {
  assert.equal(dayOf('2026-11-02').kind, 'rest', 'Monday: no running');
  assert.match(dayOf('2026-11-03').title, /biến tốc: 7 lần x 3 phút/, 'Tuesday week 2');
  assert.match(dayOf('2026-11-04').title, /Bài ở nhà A/, 'Wednesday');
  assert.match(dayOf('2026-11-05').title, /cầu thang đều 40 phút/, 'Thursday week 2');
  assert.match(dayOf('2026-11-06').title, /Bài ở nhà B/, 'Friday');
  // Iker, 2026-10-26: "Bỏ hết bài tay." Session B is the calves and the core, no arm exercise anywhere.
  const fri = textOf(dayOf('2026-11-06'));
  assert.match(fri, /Nhón gót gối gập/);
  assert.match(fri, /Bird Dog/);
  for (const [k, d] of plan.days) {
    assert.doesNotMatch(textOf(d), /Hít đất|Tricep|Kéo dây|Đẩy dây|Chống gậy với dây|tay chống gậy|Xoay vai|tay và vai/, k);
  }
});

test('mountain days by day, night runs in the park, the lighter weeks (Iker, 2026-10-22)', () => {
  for (const k of ['2026-11-01', '2026-11-15', '2026-12-06']) {
    const d = dayOf(k);
    assert.match(d.title, /Núi Dinh/, k);
    assert.equal(d.sections[0]!.items.find(i => i.tag === 'train')?.time, '6:00', `${k}: the mountain only by day`);
    assert.match(textOf(d), /trong nắng/, `${k}: the heat at the end is on purpose`);
  }
  assert.match(textOf(dayOf('2026-12-06')), /tập thử cho ngày đua/);
  assert.match(textOf(dayOf('2026-10-31')), /Gậy, ba lô/, 'Saturday before a mountain day: get the gear ready');
  for (const k of ['2026-11-29', '2026-12-13']) {
    const d = dayOf(k);
    assert.match(d.title, /trong đêm/, k);
    const run = d.sections[0]!.items.find(i => i.tag === 'train')!;
    assert.equal(run.time, '3:00', k);
    assert.match(run.text, /công viên/, k);
  }
  assert.match(dayOf('2026-11-17').title, /5 lần x 3 phút/, 'week 4 is lighter');
  assert.match(textOf(dayOf('2026-12-16')), /Buổi tập chân cuối cùng/);
  assert.doesNotMatch(textOf(dayOf('2026-12-18')), /Nhón gót gối gập/, 'week 8 Friday: core only');
  assert.match(dayOf('2026-12-18').title, /core \(nhẹ\)/);
  assert.match(textOf(dayOf('2026-11-12')), /2 chai nước/, 'backpack from week 3');
});

test("the race week and the race day (the organizer's page, 2026-10-22)", () => {
  assert.equal(dayOf('2026-12-21').kind, 'rest');
  assert.equal(dayOf('2026-12-25').kind, 'rest');
  assert.match(dayOf('2026-12-25').title, /Soạn đồ/);
  assert.match(textOf(dayOf('2026-12-25')), /Còi/, 'the gear the organizer asks for is listed');
  const eve = dayOf('2026-12-26');
  assert.match(eve.title, /Xuống Núi Dinh/);
  assert.match(textOf(eve), /20 phút/);
  assert.match(textOf(eve), /"19:00"/, 'early sleep: the race starts at 02:00');
  assert.deepEqual(P.habaItems(eve), ['jog']);
  const race = dayOf(P.RACE);
  assert.equal(race.kind, 'race');
  assert.deepEqual(race.sections.map(s => s.name), ['Thông tin giải', 'Trước giờ xuất phát', 'Trong giải', 'Sau khi về đích']);
  const t = textOf(race);
  for (const s of ['02:00', '16 tiếng', 'chưa công bố', '13 phút mỗi km', 'giờ thứ 5', 'Đèn đội đầu', 'tô, muỗng, ly']) assert.match(t, new RegExp(s), s);
  assert.doesNotMatch(t, /4000|4\.000|3500|3\.500 m leo/, 'no climb number given as a fact');
});

test('states and counts', () => {
  const today = '2026-10-28'; // Wednesday
  const done = new Set(['2026-10-21', '2026-10-25', '2026-10-26', '2026-10-28']);
  assert.equal(plan.stateOf('2026-10-20', today, done), 'out', 'before the start');
  assert.equal(plan.stateOf('2026-12-28', today, done), 'out', 'after the race');
  assert.equal(plan.stateOf('2026-10-21', today, done), 'done');
  assert.equal(plan.stateOf('2026-10-23', today, done), 'missed', 'Friday is a training day');
  assert.equal(plan.stateOf('2026-10-26', today, done), 'done', 'a Monday has core: it is marked like any day (Iker, 2026-10-26)');
  assert.equal(plan.stateOf('2026-11-02', '2026-11-03', new Set()), 'missed', 'a Monday not done is missed');
  assert.equal(plan.stateOf('2026-12-25', today, done), 'rest', 'the gear day has no training at all');
  assert.equal(plan.stateOf('2026-10-28', today, new Set()), 'open', 'today, not done yet');
  assert.equal(plan.stateOf('2026-10-29', today, done), 'future');
  // 21 done, 22 23 24 missed, 25 26 done, 27 missed, 28 done
  assert.deepEqual(plan.summary(today, done), { done: 4, missed: 4, daysToRace: 60 });
  assert.ok(plan.canMark('2026-10-22', today), 'a past day can still be marked');
  assert.ok(!plan.canMark('2026-10-29', today), 'not a future day');
  assert.ok(plan.canMark('2026-10-26', today), 'a Monday with core can be marked');
  assert.ok(!plan.canMark('2026-12-25', '2026-12-27'), 'not the gear day: nothing to train');
  assert.ok(plan.canMark('2026-12-21', '2026-12-27'), 'the light core Monday of the race week can be marked');
  assert.deepEqual(P.habaItems(dayOf('2026-10-26')), ['core'], 'a Monday marks Core in Haba, not Jogging');
  assert.ok(!plan.canMark('2026-10-20', today), 'not a day without a plan');
  // a plan of 8 days only knows those 8
  const small = P.makePlan(R.generateAll('2026-10-22', '2026-10-29'));
  assert.equal(small.stateOf('2026-10-30', today, done), 'out');
  assert.equal(small.summary(today, done).done, 3);
});

test('the days folder: every file is a good recipe of its date', () => {
  const files = readdirSync('days').filter(f => f.endsWith('.json')).sort();
  assert.ok(files.length >= 1, 'days/ has files (run: node tools/next-day.ts)');
  const recipes = files.map(f => JSON.parse(readFileSync('days/' + f, 'utf8')) as P.Recipe);
  files.forEach((f, i) => assert.equal(recipes[i]!.date, f.slice(0, 10), f));
  assert.equal(P.daysBetween(files[0]!.slice(0, 10), files.at(-1)!.slice(0, 10)) + 1, files.length, 'no missing day in between');
  assert.equal(files[0]!.slice(0, 10), P.START, 'the history starts at the start of the plan');
  const p = P.makePlan(recipes);
  for (const [k, d] of p.days) {
    assert.ok(d.title, k);
    assert.ok(d.sections.length >= 3, k);
    for (const x of stepsOf(d)) assert.ok(x.note === undefined || x.note.length > 0, `${k} ${x.name}`);
  }
});

test('a cramp makes the next training day lighter (Iker, 2026-10-22)', () => {
  const ctx = (feels: Record<string, P.Feel>): R.Ctx => ({ done: new Set(Object.keys(feels)), feels: new Map(Object.entries(feels)) });
  const fri = R.generate('2026-10-30', ctx({ '2026-10-29': 'cramp' }));
  assert.match(fri.why ?? '', /Hôm qua.*chuột rút/);
  assert.equal(fri.type, 'weekday');
  if (fri.type === 'weekday') {
    assert.deepEqual(fri.pm, { kind: 'homeB', sets: 2, legs: true, note: 'Tuần đầu: tập nhẹ, chú ý làm đúng động tác.' });
    assert.deepEqual(fri.am, { run: 20 });
  }
  assert.equal(P.expand(fri).why, fri.why, 'the reason is shown under the title');
  assert.equal(P.expand(fri).title, 'Bài ở nhà B: bắp chân và core');
  // a cramp on Sunday: Monday rests as always, Tuesday is lighter
  const c = ctx({ '2026-11-08': 'cramp' });
  assert.equal(R.generate('2026-11-09', c).why, undefined);
  const tue = R.generate('2026-11-10', c);
  assert.match(tue.why ?? '', /Buổi tập trước.*chuột rút/);
  if (tue.type === 'weekday') assert.deepEqual(tue.pm, { kind: 'intervals', reps: 6, work: 3 });
  // a cramp marked on the Monday core makes Tuesday lighter (Iker, 2026-10-26); Monday "ok" keeps Sunday's cramp
  assert.match(R.generate('2026-11-10', ctx({ '2026-11-09': 'cramp' })).why ?? '', /Hôm qua.*chuột rút/);
  assert.match(R.generate('2026-11-10', ctx({ '2026-11-08': 'cramp', '2026-11-09': 'ok' })).why ?? '', /Buổi tập trước.*chuột rút/);
  assert.equal(R.generate('2026-11-10', ctx({ '2026-11-09': 'ok' })).why, undefined);
  // "nặng" twice in a row; once is normal
  const thu = R.generate('2026-11-05', ctx({ '2026-11-03': 'hard', '2026-11-04': 'hard' }));
  assert.match(thu.why ?? '', /nặng/);
  if (thu.type === 'weekday') assert.deepEqual(thu.pm, { kind: 'steady', min: 30, pack: 0 });
  assert.equal(R.generate('2026-11-05', ctx({ '2026-11-04': 'hard' })).why, undefined);
  assert.equal(R.generate('2026-11-05', ctx({ '2026-11-03': 'ok', '2026-11-04': 'easy' })).why, undefined);
  // runs get shorter; a mountain day keeps its hours but asks for care
  const sat = R.generate('2026-11-07', ctx({ '2026-11-06': 'cramp' }));
  if (sat.type === 'saturday') assert.equal(sat.min, 80);
  const sun = R.generate('2026-11-08', ctx({ '2026-11-07': 'cramp' }));
  if (sun.type === 'sunday') assert.deepEqual(sun.sun, { long: 135 });
  const mtn = R.generate('2026-11-15', ctx({ '2026-11-14': 'cramp' }));
  if (mtn.type === 'sunday') assert.deepEqual(mtn.sun, { mountain: '5 tiếng' });
  assert.match(mtn.why ?? '', /uống muối/);
  assert.equal(R.generate('2026-10-23', ctx({ '2026-10-22': 'cramp' })).why, undefined, 'the fixed first days do not change');
  assert.ok(P.makePlan(R.generateAll(P.START, P.RACE, ctx({ '2026-11-14': 'cramp', '2026-11-20': 'hard', '2026-11-21': 'hard' }))).days.size === 68);
});

test('the daily job: what it keeps and what it writes', () => {
  const today = '2026-10-30';
  const r = R.generate(today);
  assert.equal(R.decide('2026-10-29', today, r, R.EMPTY), 'keep', 'the past');
  assert.equal(R.decide('2026-11-02', today, null, R.EMPTY), 'write', 'missing');
  assert.equal(R.decide('2026-10-20', today, null, R.EMPTY), 'write', 'a missing past day is written for the history');
  assert.equal(R.decide('2026-11-02', today, { ...r, locked: true }, R.EMPTY), 'keep', 'locked');
  assert.equal(R.decide(today, today, r, R.EMPTY), 'write', 'today, not done yet');
  assert.equal(R.decide(today, today, r, { done: new Set([today]), feels: new Map() }), 'keep', 'today, done');
  assert.equal(R.decide('2026-11-02', today, r, R.EMPTY), 'write', 'a future day is written again');
});

test('voice guide: timings of one set', () => {
  const at = (cs: G.Cue[], clip: string): number[] => cs.filter(c => c.clip === clip).map(c => c.at);
  const plank = G.cues({ ex: 'plank', sets: 3, hold: 30 }, 1);
  assert.equal(plank[0]?.clip, 'plank', 'the voice names the exercise');
  assert.deepEqual(at(plank, 'go'), [G.LEAD]);
  assert.deepEqual(at(plank, 'ten'), [G.LEAD + 20]);
  assert.deepEqual(plank.at(-1), { at: G.LEAD + 30, clip: 'done', big: '✓', small: 'Xong hiệp 1/3' });
  assert.equal(G.cues({ ex: 'plank', sets: 3, hold: 30 }, 3).at(-1)?.small, 'Xong bài này');
  const side = G.cues({ ex: 'side', sets: 2, hold: 20 }, 2);
  assert.deepEqual(at(side, 'switch'), [G.LEAD + 20], 'left side, then switch');
  assert.deepEqual(at(side, 'go'), [G.LEAD, G.LEAD + 25], '5 seconds to switch sides');
  assert.equal(side.at(-1)?.at, G.LEAD + 45);
  const bug = G.cues({ ex: 'deadbug', sets: 3, reps: 20, pace: 6 }, 1);
  assert.deepEqual(bug.filter(c => /^n\d+$/.test(c.clip ?? '') && c.at > G.LEAD).map(c => c.clip), Array.from({ length: 20 }, (_, i) => `n${i + 1}`));
  assert.equal(bug.at(-1)?.at, G.LEAD + 1 + 120, '6 seconds per repetition: out, hold 2 seconds, back (Iker, 2026-10-22)');
  for (const cs of [plank, side, bug]) assert.ok(cs.every((c, i) => i === 0 || c.at >= cs[i - 1]!.at), 'cues in time order');
});

test('voice guide: every core exercise has one, and every line it says is in voice.mp3', () => {
  assert.equal(Object.keys(G.VOICE_LINES).length, 30, '30 lines, no near copies (Iker, 2026-10-21)');
  assert.deepEqual(VOICE_TEXT, G.VOICE_LINES, 'the voice file is out of date: run node tools/make-voice.mjs');
  let n = 0;
  for (const k of allDays()) {
    for (const x of stepsOf(dayOf(k))) {
      if (/Plank|Dead Bug|Bird Dog|Glute Bridge/.test(x.name)) assert.ok(x.guide, `${k} ${x.name}`);
      if (!x.guide) continue;
      n++;
      if (x.guide.reps) assert.ok((x.guide.pace ?? 3) >= 5, `${k} ${x.name}: time to hold 2 seconds (Iker, 2026-10-22)`);
      for (let set = 1; set <= x.guide.sets; set++) {
        for (const c of G.cues(x.guide, set)) if (c.clip) assert.ok(VOICE[c.clip], `${k} ${x.name}: no sound for ${c.clip}`);
      }
    }
  }
  assert.ok(n > 50, `only ${n} core exercises with a voice guide`);
  assert.match(dayOf('2026-10-26').sections[2]!.items[0]!.steps![0]!.dose!, /^3 x 30 giây$/, 'week 1 plank: 30 seconds');
  assert.match(dayOf('2026-11-23').sections[2]!.items[0]!.steps![0]!.dose!, /^3 x 45 giây$/, 'week 5 plank: 45 seconds');
});

test('a done day marks jogging and/or core in Haba (Iker, 2026-10-21)', () => {
  const items = (k: string): string => P.habaItems(dayOf(k)).join(' ');
  assert.equal(items('2026-10-21'), 'jog');      // easy run
  assert.equal(items('2026-10-22'), 'core');     // core, then stairs
  assert.equal(items('2026-10-23'), 'core');     // the trial of A and B
  assert.equal(items('2026-10-29'), '');         // stairs only
  assert.equal(items('2026-10-30'), 'jog core'); // easy run and home session B
  assert.equal(items('2026-11-01'), 'jog');      // Núi Dinh
  assert.equal(items(P.RACE), 'jog');
  for (const k of allDays()) {
    const d = dayOf(k);
    if (d.kind === 'train' && /chạy/i.test(d.title)) assert.ok(P.habaItems(d).includes('jog'), k);
  }
});

test('every exercise has a video, and every video is used (Iker, 2026-10-22)', () => {
  const used = new Set<string>();
  for (const k of allDays()) {
    for (const x of stepsOf(dayOf(k))) {
      if (x.dose && !/Khởi động|Thả lỏng|Nghỉ|Lên xuống|Ăn|Uống/.test(x.name) && Array.isArray(x.note)) {
        assert.ok(x.video, `${k} ${x.name}: no video`);
      }
      if (x.video) { assert.ok(VIDEOS[x.video], `${k} ${x.name}: unknown video ${x.video}`); used.add(x.video); }
    }
  }
  const keys = Object.keys(VIDEOS).sort();
  assert.deepEqual([...used].sort(), keys, 'every video is used by some exercise');
  assert.deepEqual(GROUPS.flatMap(g => [...g.keys]).sort(), keys, 'the tab shows every video once');
  for (const v of Object.values(VIDEOS)) {
    assert.match(v.id, /^[\w-]{11}$/, v.name);
    assert.ok(v.name && v.by && v.note.startsWith('Xem:'), v.name);
  }
  assert.ok(P.RACE_TAB_FROM < P.RACE && P.daysBetween(P.RACE_TAB_FROM, P.RACE) === 6, 'the race tab from the Monday of the race week');
});
