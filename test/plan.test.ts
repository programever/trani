// Tests for src/plan.ts. Run: node --test test/plan.test.ts
process.env.TZ = 'Asia/Ho_Chi_Minh';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../src/plan.ts';
import * as G from '../src/guide.ts';
import { VOICE, VOICE_TEXT } from '../src/voice.ts';

const allDays = (): string[] => P.weeks().flat().filter(P.inPlan);
const textOf = (d: P.Day): string => JSON.stringify(d);

test('dates of the plan', () => {
  assert.equal(P.weekday(P.START), 2, 'START (21 Oct 2026) is a Wednesday');
  assert.equal(P.weekday(P.RACE), 6, 'the race (27 Dec 2026) is a Sunday');
  assert.equal(P.daysBetween(P.START, P.RACE), 67);
  const w = P.weeks();
  assert.equal(w.length, 10, 'ten rows: 19 Oct to 27 Dec');
  assert.equal(w[0]?.[0], '2026-10-19');
  assert.equal(w[9]?.[6], P.RACE);
  assert.ok(w.every(x => x.length === 7));
  assert.deepEqual(P.WEEK_LABELS, ['Bắt đầu', 'Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5', 'Tuần 6', 'Tuần 7', 'Tuần 8', 'Tuần đua']);
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
    const d = P.planOf(k);
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
    for (const it of P.planOf(k).sections.flatMap(s => s.items).filter(i => i.tag === 'eat')) {
      assert.doesNotMatch(words(it.text + ' ' + (it.note ?? '')), dish, `${k} ${it.text}`);
      if (k !== P.RACE && it.text.startsWith('Ăn')) assert.match(it.text, /nhẹ|vừa|nặng/, `${k} ${it.text}`);
    }
  }
});

test('no gym: everything is done at home (Iker, 2026-10-21)', () => {
  for (const k of allDays()) assert.doesNotMatch(textOf(P.planOf(k)), /gym|máy chạy/i, k);
});

test('core is never in the same session as a run in the park (Iker, 2026-10-21)', () => {
  for (const k of allDays()) {
    for (const it of P.planOf(k).sections.flatMap(s => s.items)) {
      if (/^Chạy/.test(it.text)) assert.ok(!it.steps?.some(x => /Plank|Dead Bug|Bird Dog|Glute Bridge/.test(x.name)), `${k} ${it.text}`);
    }
  }
  // Core in the morning, the run in the evening; never core after dinner.
  assert.match(JSON.stringify(P.planOf('2026-10-22').sections[0]), /core ở nhà/);
  assert.match(JSON.stringify(P.planOf('2026-12-23').sections[0]), /Core nhẹ ở nhà/);
  for (const k of allDays()) {
    for (const s of P.planOf(k).sections) {
      const dinnerAt = s.items.findIndex(i => i.text.startsWith('Ăn tối'));
      if (dinnerAt >= 0) assert.ok(!s.items.slice(dinnerAt).some(i => i.steps?.some(x => /Plank/.test(x.name))), `${k}: core after dinner`);
    }
  }
});

test('every exercise at home has a detailed how-to', () => {
  for (const k of ['2026-11-02', '2026-11-04', '2026-11-06']) {
    const steps = P.planOf(k).sections.flatMap(s => s.items).flatMap(i => i.steps ?? []);
    assert.ok(steps.length >= 5, k);
    for (const x of steps) {
      assert.ok(Array.isArray(x.note) && x.note.length >= (x.name === 'Khởi động' ? 2 : 3), `${k} ${x.name}`);
    }
  }
});

test('the normal week', () => {
  assert.equal(P.planOf('2026-11-02').kind, 'rest', 'Monday: no running');
  assert.match(P.planOf('2026-11-03').title, /biến tốc: 7 lần x 3 phút/, 'Tuesday week 2');
  assert.match(P.planOf('2026-11-04').title, /Bài ở nhà A/, 'Wednesday');
  assert.match(P.planOf('2026-11-05').title, /cầu thang đều 40 phút/, 'Thursday week 2');
  assert.match(P.planOf('2026-11-06').title, /Bài ở nhà B/, 'Friday');
  assert.match(P.planOf('2026-11-07').title, /Chạy có dốc 2 tiếng/, 'Saturday week 2');
  assert.match(P.planOf('2026-11-08').title, /Chạy dài 3 tiếng/, 'Sunday week 2');
  // morning runs: week 2 on Tuesday, Wednesday and Friday, never on Thursday
  const amRun = (k: string): boolean => P.planOf(k).sections[0]!.items.some(i => i.tag === 'train');
  assert.deepEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'].map(amRun), [false, true, true, false, true]);
});

test('mountain days, the lighter weeks and the race week', () => {
  for (const k of ['2026-11-01', '2026-11-15', '2026-12-06']) assert.match(P.planOf(k).title, /Núi Dinh/, k);
  assert.match(textOf(P.planOf('2026-12-06')), /tập thử cho ngày đua/);
  assert.match(textOf(P.planOf('2026-10-31')), /đèn đội đầu/, 'Saturday before a mountain day: get the gear ready');
  assert.match(P.planOf('2026-11-17').title, /5 lần x 3 phút/, 'week 4 is lighter');
  assert.match(textOf(P.planOf('2026-12-16')), /Buổi tập chân cuối cùng/);
  assert.doesNotMatch(textOf(P.planOf('2026-12-18')), /Nhón gót gối gập/, 'week 8 Friday: arms and core only');
  assert.match(textOf(P.planOf('2026-11-12')), /2 chai nước/, 'backpack from week 3');
  assert.match(P.planOf('2026-12-26').title, /rất nhẹ 20 phút/, 'no long run the day before the race');
  assert.equal(P.planOf('2026-12-25').kind, 'rest');
  const race = P.planOf(P.RACE);
  assert.equal(race.kind, 'race');
  assert.deepEqual(race.sections.map(s => s.name), ['Trước giờ xuất phát', 'Trong giải', 'Sau khi về đích']);
});

test('states and counts', () => {
  const today = '2026-10-28'; // Wednesday
  const done = new Set(['2026-10-21', '2026-10-25', '2026-10-26', '2026-10-28']);
  assert.equal(P.stateOf('2026-10-20', today, done), 'out', 'before the start');
  assert.equal(P.stateOf('2026-12-28', today, done), 'out', 'after the race');
  assert.equal(P.stateOf('2026-10-21', today, done), 'done');
  assert.equal(P.stateOf('2026-10-23', today, done), 'missed', 'Friday is a training day now');
  assert.equal(P.stateOf('2026-10-26', today, done), 'rest', 'a mark on a Monday is ignored');
  assert.equal(P.stateOf('2026-10-28', today, new Set()), 'open', 'today, not done yet');
  assert.equal(P.stateOf('2026-10-29', today, done), 'future');
  // 21 done, 22 23 24 missed, 25 done, 26 rest, 27 missed, 28 done
  assert.deepEqual(P.summary(today, done), { done: 3, missed: 4, daysToRace: 60 });
  assert.ok(P.canMark('2026-10-22', today), 'a past day can still be marked');
  assert.ok(!P.canMark('2026-10-29', today), 'not a future day');
  assert.ok(!P.canMark('2026-10-26', today), 'not a rest day');
  assert.ok(!P.canMark('2026-10-20', today), 'not before the start');
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
  const bug = G.cues({ ex: 'deadbug', sets: 3, reps: 20, pace: 3 }, 1);
  assert.deepEqual(bug.filter(c => /^n\d+$/.test(c.clip ?? '') && c.at > G.LEAD).map(c => c.clip), Array.from({ length: 20 }, (_, i) => `n${i + 1}`));
  assert.equal(bug.at(-1)?.at, G.LEAD + 1 + 60);
  for (const cs of [plank, side, bug]) assert.ok(cs.every((c, i) => i === 0 || c.at >= cs[i - 1]!.at), 'cues in time order');
});

test('voice guide: every core exercise has one, and every line it says is in voice.mp3', () => {
  assert.equal(Object.keys(G.VOICE_LINES).length, 30, '30 lines, no near copies (Iker, 2026-10-21)');
  assert.deepEqual(VOICE_TEXT, G.VOICE_LINES, 'the voice file is out of date: run node tools/make-voice.mjs');
  let n = 0;
  for (const k of allDays()) {
    for (const x of P.planOf(k).sections.flatMap(s => s.items).flatMap(i => i.steps ?? [])) {
      if (/Plank|Dead Bug|Bird Dog|Glute Bridge/.test(x.name)) assert.ok(x.guide, `${k} ${x.name}`);
      if (!x.guide) continue;
      n++;
      for (let set = 1; set <= x.guide.sets; set++) {
        for (const c of G.cues(x.guide, set)) if (c.clip) assert.ok(VOICE[c.clip], `${k} ${x.name}: no sound for ${c.clip}`);
      }
    }
  }
  assert.ok(n > 50, `only ${n} core exercises with a voice guide`);
  assert.match(P.planOf('2026-10-26').sections[2]!.items[0]!.steps![0]!.dose!, /^3 x 30 giây$/, 'week 1 plank: 30 seconds');
  assert.match(P.planOf('2026-11-23').sections[2]!.items[0]!.steps![0]!.dose!, /^3 x 45 giây$/, 'week 5 plank: 45 seconds');
});

test('a done day marks jogging and/or core in Haba (Iker, 2026-10-21)', () => {
  const items = (k: string) => P.habaItems(P.planOf(k)).join(' ');
  assert.equal(items('2026-10-21'), 'jog');      // easy run
  assert.equal(items('2026-10-22'), 'core');     // core, then stairs
  assert.equal(items('2026-10-29'), '');         // stairs only
  assert.equal(items('2026-10-30'), 'jog core'); // easy run and home session B
  assert.equal(items('2026-11-01'), 'jog');      // Núi Dinh
  assert.equal(items(P.RACE), 'jog');
  for (let k = P.START; k <= P.RACE; k = P.addDays(k, 1)) {
    const d = P.planOf(k);
    if (d.kind === 'train' && /chạy/i.test(d.title)) assert.ok(P.habaItems(d).includes('jog'), k);
  }
});
