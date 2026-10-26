// The plan rules: what kind of day each date is, and how a day changes after how the last days felt.
// generate(date, ctx) gives the recipe of one date (the Recipe type is in plan.ts). tools/next-day.ts writes the
// recipes of today and the next 7 days into days/ every morning, and the page shows those files. Alpha can
// rewrite any day by hand with Iker (locked: true keeps it). No browser things, so the tests can check every date.
//
// The weeks (Iker, 2026-10-21): a start week, weeks 1-3 build up, week 4 lighter, weeks 5-7 build up, week 8 and
// the race week lighter. Núi Dinh by day on Sunday 1 Nov, 15 Nov and 6 Dec. No trial sessions (Iker, 2026-10-26). Two long runs in the
// park at night (29 Nov, 13 Dec), like the 02:00 start of the race; never on the mountain at night (Iker, 2026-10-22).
// Cramps came at about hour 5 in both slow races (Iker, 2026-10-22), so a day marked "chuột rút" makes the next
// training day lighter, and "nặng" twice in a row does the same.

import * as P from './plan.ts';

/** What the plan knows about the past: the done days and how they felt. */
export interface Ctx { done: ReadonlySet<P.DayKey>; feels: ReadonlyMap<P.DayKey, P.Feel> }
export const EMPTY: Ctx = { done: new Set(), feels: new Map() };

interface Week {
  label: string;           // shown above the day title
  am: readonly number[];   // weekdays (0 = Monday) with an easy run in the morning
  amMin: number;
  reps: number;            // Tuesday stair intervals: reps x work minutes
  work: number;
  steady: number;          // Thursday steady stairs, minutes
  pack: number;            // backpack with this many 1 kg bottles of water on Thursday
  sets: number;            // sets of the home sessions
  sat: number;             // Saturday run, minutes
  sun: P.Sunday;
  homeNote?: string;
  lastLegs?: boolean;      // week 8: the last leg session, and session B is core only
}

/** One row per week, from the start week (19 Oct) to the race week: see P.weekIndex(). */
const WEEKS: readonly Week[] = [
  { label: 'Tuần bắt đầu', am: [], amMin: 0, reps: 0, work: 0, steady: 30, pack: 0, sets: 2, sat: 90, sun: { long: 150 } },
  { label: 'Tuần 1', am: [1, 4], amMin: 30, reps: 6, work: 3, steady: 35, pack: 0, sets: 3, sat: 90,
    sun: { mountain: '4 tiếng' }, homeNote: 'Tuần đầu: tập nhẹ, chú ý làm đúng động tác.' },
  { label: 'Tuần 2', am: [1, 2, 4], amMin: 35, reps: 7, work: 3, steady: 40, pack: 0, sets: 3, sat: 120, sun: { long: 180 } },
  { label: 'Tuần 3', am: [1, 2, 4], amMin: 40, reps: 8, work: 3, steady: 45, pack: 2, sets: 3, sat: 90,
    sun: { mountain: '5 tiếng' } },
  { label: 'Tuần 4 · tuần nhẹ', am: [1, 4], amMin: 30, reps: 5, work: 3, steady: 30, pack: 2, sets: 2, sat: 90,
    sun: { long: 150 }, homeNote: 'Tuần nhẹ: mỗi bài bớt 1 hiệp.' },
  { label: 'Tuần 5', am: [1, 2, 4], amMin: 40, reps: 6, work: 4, steady: 45, pack: 3, sets: 3, sat: 120, sun: { long: 210, night: true } },
  { label: 'Tuần 6', am: [1, 2, 4], amMin: 40, reps: 7, work: 4, steady: 50, pack: 3, sets: 3, sat: 60,
    sun: { mountain: '6 - 7 tiếng' } },
  { label: 'Tuần 7 · tuần nặng nhất', am: [1, 2, 4], amMin: 40, reps: 8, work: 4, steady: 50, pack: 3, sets: 3, sat: 120,
    sun: { long: 180, night: true } },
  { label: 'Tuần 8 · bắt đầu giảm', am: [1, 4], amMin: 30, reps: 5, work: 3, steady: 30, pack: 0, sets: 2, sat: 60,
    sun: { long: 120 }, lastLegs: true },
  { label: 'Tuần đua', am: [], amMin: 0, reps: 0, work: 0, steady: 0, pack: 0, sets: 2, sat: 0, sun: { long: 0 } },
];

const item = (time: string, tag: P.Tag, text: string, note?: string): P.Item => note ? { time, tag, text, note } : { time, tag, text };

/** Friday 25 Dec: no training, the race gear is packed (Iker, 2026-10-22: by car to Núi Dinh the day before the race). */
function gearDay(): P.Day {
  return {
    kind: 'rest', title: 'Nghỉ. Soạn đồ đua, ăn nhiều tinh bột.', week: 'Tuần đua',
    sections: [
      { name: 'Sáng', items: [item('6:30', 'care', 'Thức dậy. Uống 1 ly nước.'), item('7:30', 'eat', 'Ăn sáng vừa: nhiều tinh bột.')] },
      { name: 'Trưa', items: [
        item('12:00', 'eat', 'Ăn trưa nặng: nhiều tinh bột, ít rau.', 'Từ hôm nay đến ngày đua, ăn nhiều tinh bột hơn bình thường.'),
        item('16:00', 'eat', 'Ăn nhẹ: tinh bột.'),
      ] },
      { name: 'Tối', items: [
        item('18:00', 'care', 'Soạn đồ đua. Đồ bắt buộc của giải: ' + P.RACE_GEAR,
          'Thêm: giày, gậy, nón, áo mưa, đồ ăn khi chạy, viên điện giải, tô, muỗng, ly, túi gửi đồ ghi số BIB và tên, sạc dự phòng.'),
        item('19:00', 'eat', 'Ăn tối nặng: nhiều tinh bột, ít dầu mỡ.', 'Ăn món quen.'),
        item('22:00', 'care', 'Đi ngủ. Ngủ đủ 7 - 8 tiếng.'),
      ] },
    ],
  };
}

/** Saturday 26 Dec: a very short run, the drive to Núi Dinh, a long nap, early sleep (the race starts at 02:00). */
function eveDay(): P.Day {
  return {
    kind: 'train', title: 'Xuống Núi Dinh. Chạy rất nhẹ 20 phút. Ngủ sớm.', week: 'Tuần đua',
    sections: [
      { name: 'Sáng', items: [
        item('6:30', 'care', 'Thức dậy. Uống 1 ly nước.'),
        item('7:00', 'train', 'Chạy rất nhẹ 20 phút (Z2).', 'Chân nhẹ, không mệt. Chỉ để người không cứng.'),
        item('7:45', 'eat', 'Ăn sáng vừa: nhiều tinh bột.'),
        item('9:00', 'care', 'Đi ô tô xuống Núi Dinh. Mang theo nước và đồ ăn nhẹ.'),
      ] },
      { name: 'Trưa', items: [
        item('12:00', 'eat', 'Ăn trưa nặng: nhiều tinh bột, ít rau, ít dầu mỡ.', 'Món quen. Không thử món mới.'),
        item('13:00', 'care', 'Ngủ trưa 2 tiếng.', 'Tối nay ngủ ít, nên ngủ bù từ trưa.'),
        item('15:30', 'eat', 'Ăn nhẹ: tinh bột.'),
      ] },
      { name: 'Tối', items: [
        item('17:00', 'care', 'Kiểm tra lại đồ đua, số đeo (bib), sạc đồng hồ và đèn. Soạn sẵn đồ mặc lúc 23 giờ.'),
        item('17:30', 'eat', 'Ăn tối sớm, vừa: nhiều tinh bột, ít rau, ít dầu mỡ.'),
        item('19:00', 'care', 'Đi ngủ. Đặt báo thức 23:00.', 'Ngủ được 4 tiếng là tốt. Không ngủ được cũng không sao: nằm nghỉ, nhắm mắt.'),
      ] },
    ],
  };
}

/** Days that do not follow the normal week: the first days and the race week. */
function special(date: P.DayKey): P.Recipe | null {
  const start = 'Tuần bắt đầu', raceWeek = 'Tuần đua';
  switch (date) {
    case '2026-10-21': return { date, week: start, type: 'weekday', title: 'Chạy dễ 50 phút', am: null, pm: { kind: 'run', min: 50 } };
    case '2026-10-22': return { date, week: start, type: 'weekday', title: 'Thử bài core, leo cầu thang đều 30 phút',
      am: { core: 2, text: 'Thử bài core ở nhà, khoảng 10 phút.', note: 'Lần đầu tập core: mỗi bài 2 hiệp, làm chậm và đúng.' },
      pm: { kind: 'steady', min: 30, pack: 0, easy: true } };
    case '2026-10-23': return { date, week: start, type: 'weekday', am: null, pm: { kind: 'trialAB' } };
    case '2026-12-21': return { date, week: raceWeek, type: 'rest', coreSets: 2 };
    case '2026-12-22': return { date, week: raceWeek, type: 'weekday', title: 'Chạy dễ 40 phút, có leo dốc nhẹ', am: null,
      pm: { kind: 'run', min: 40, text: 'Chạy dễ 40 phút, trong đó có 4 lần x 2 phút leo dốc ở mức vừa (Z3).',
        note: 'Leo trên cầu thang hoặc một cây cầu. Đi bộ 2 phút giữa các lần.' } };
    case '2026-12-23': return { date, week: raceWeek, type: 'weekday', title: 'Core nhẹ, chạy dễ 30 phút',
      am: { core: 2, text: 'Core nhẹ ở nhà, khoảng 10 phút.' }, pm: { kind: 'run', min: 30 } };
    case '2026-12-24': return { date, week: raceWeek, type: 'weekday', title: 'Chạy dễ 30 phút và 4 lần chạy nhanh', am: null,
      pm: { kind: 'run', min: 30, text: 'Chạy dễ 30 phút. Cuối buổi chạy nhanh 4 lần, mỗi lần 20 giây.',
        note: 'Đi bộ 1 phút giữa các lần chạy nhanh. Không mệt là đúng.' } };
    case '2026-12-25': return { date, week: raceWeek, type: 'custom', day: gearDay() };
    case '2026-12-26': return { date, week: raceWeek, type: 'custom', day: eveDay() };
    case P.RACE: return { date, week: raceWeek, type: 'race' };
    default: return null;
  }
}

/** Mondays and the Friday before the race are rest days. */
function isRest(date: P.DayKey): boolean { return P.weekday(date) === 0 || date === '2026-12-25'; }

/** The reason for a lighter day, or null: a cramp on the last training day, or "nặng" two training days in a row. */
export function lighterWhy(date: P.DayKey, ctx: Ctx): string | null {
  const prev: P.DayKey[] = [];   // the two training days before this one, skipping rest days
  for (let d = P.addDays(date, -1); prev.length < 2 && P.daysBetween(d, date) <= 4; d = P.addDays(d, -1)) {
    if (!isRest(d)) prev.push(d);
  }
  // A rest day with core can be marked too (Iker, 2026-10-26). A cramp marked on it makes the next day lighter.
  const yesterday = P.addDays(date, -1);
  if (isRest(yesterday) && ctx.feels.get(yesterday) === 'cramp') return 'Hôm qua bạn ghi «chuột rút», nên hôm nay nhẹ hơn.';
  const [a, b] = prev;
  if (!a) return null;
  const fa = ctx.feels.get(a), fb = b ? ctx.feels.get(b) : undefined;
  const when = P.daysBetween(a, date) === 1 ? 'Hôm qua' : 'Buổi tập trước';
  if (fa === 'cramp') return `${when} bạn ghi «chuột rút», nên hôm nay nhẹ hơn.`;
  if (fa === 'hard' && fb === 'hard') return 'Hai buổi liền bạn ghi «nặng», nên hôm nay nhẹ hơn.';
  return null;
}

/** Round to the nearest `step`, never under `min`. */
const down = (n: number, factor: number, step: number, min: number): number => Math.max(min, Math.round(n * factor / step) * step);

function softenPm(pm: P.Pm): P.Pm {
  switch (pm.kind) {
    case 'intervals': return { ...pm, reps: Math.max(3, pm.reps - 2) };
    case 'homeA': case 'homeB': return { ...pm, sets: Math.max(1, pm.sets - 1) };
    case 'steady': return { ...pm, min: Math.max(20, pm.min - 10), pack: 0 };
    case 'run': return { ...pm, min: Math.max(20, pm.min - 10) };
    default: return pm;
  }
}

/** A lighter version of a day: fewer sets or reps, shorter runs. A mountain day keeps its hours but asks for care. */
export function soften(r: P.Recipe, why: string): P.Recipe {
  switch (r.type) {
    case 'weekday': {
      const am: P.Am = r.am && 'run' in r.am ? (r.am.run - 10 >= 20 ? { run: r.am.run - 10 } : null) : r.am;
      return { ...r, why, am, pm: softenPm(r.pm) };
    }
    case 'saturday': return { ...r, why, min: down(r.min, 0.7, 10, 40) };
    case 'sunday': return 'long' in r.sun
      ? { ...r, why, sun: { ...r.sun, long: down(r.sun.long, 0.75, 15, 60) } }
      : { ...r, why: why + ' Leo chậm, bước ngắn, uống muối mỗi giờ.' };
    default: return r;   // rest, race, custom: unchanged
  }
}

/** The recipe of one date. */
export function generate(date: P.DayKey, ctx: Ctx = EMPTY): P.Recipe {
  const sp = special(date);
  if (sp) return sp;
  const w = WEEKS[P.weekIndex(date)]!;
  const wd = P.weekday(date);
  const am: P.Am = w.am.includes(wd) ? { run: w.amMin } : null;
  const base = { date, week: w.label };
  let r: P.Recipe;
  switch (wd) {
    case 0: r = { ...base, type: 'rest', coreSets: 3 }; break;
    case 1: r = { ...base, type: 'weekday', am, pm: { kind: 'intervals', reps: w.reps, work: w.work } }; break;
    case 2: r = w.lastLegs
      ? { ...base, type: 'weekday', title: 'Bài ở nhà A: chân và core (nhẹ)', am, pm: { kind: 'homeA', sets: w.sets, note: 'Buổi tập chân cuối cùng trước giải. Tập nhẹ.' } }
      : { ...base, type: 'weekday', am, pm: w.homeNote ? { kind: 'homeA', sets: w.sets, note: w.homeNote } : { kind: 'homeA', sets: w.sets } };
      break;
    case 3: r = { ...base, type: 'weekday', am, pm: { kind: 'steady', min: w.steady, pack: w.pack } }; break;
    case 4: r = { ...base, type: 'weekday', am, pm: w.homeNote
      ? { kind: 'homeB', sets: w.sets, legs: !w.lastLegs, note: w.homeNote } : { kind: 'homeB', sets: w.sets, legs: !w.lastLegs } };
      break;
    case 5: r = { ...base, type: 'saturday', min: w.sat, mountainTomorrow: 'mountain' in w.sun }; break;
    default: r = { ...base, type: 'sunday', sun: w.sun };
  }
  const why = lighterWhy(date, ctx);
  return why ? soften(r, why) : r;
}

/** The recipes of every date from `from` to `to` (never past the race). */
export function generateAll(from: P.DayKey, to: P.DayKey, ctx: Ctx = EMPTY): P.Recipe[] {
  const out: P.Recipe[] = [];
  for (let d = from; d <= to && d <= P.RACE; d = P.addDays(d, 1)) out.push(generate(d, ctx));
  return out;
}

/**
 * What the daily job does with the file of one date. A missing day is always written (also a past one, for the
 * history). A past day, a locked day, and today once it is marked done are never rewritten. Every other day in the
 * window is written again, so that a cramp yesterday makes today lighter.
 */
export function decide(date: P.DayKey, todayKey: P.DayKey, existing: P.Recipe | null, ctx: Ctx): 'keep' | 'write' {
  if (!existing) return 'write';
  if (existing.locked) return 'keep';
  if (date < todayKey) return 'keep';
  if (date === todayKey && ctx.done.has(date)) return 'keep';
  return 'write';
}
