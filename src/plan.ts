// Trani: the training plan for the 65 km Núi Dinh race (Dinh Harvest Final 2026), and the day maths.
// No browser things in here, so it can also run under node for the tests (see test/plan.test.ts).
//
// Since 2026-10-22 the plan is not a fixed ten-week table any more (Iker: "chỉ cần kế hoạch 7 ngày tới").
// Every day is one small recipe (a file in days/): the kind of day and the doses. src/generate.ts makes the
// recipe of a date from the plan rules and from how the last days felt; tools/next-day.ts writes the recipes of
// today and the next 7 days every morning. expand() turns a recipe into the full day: three parts (Sáng, Trưa,
// Tối: morning, noon, evening), each a list of what to eat and what to do, with a time. Iker follows the list.
// Training is at home only (one floor of stairs and two resistance bands, no gym), weekdays 07:30-08:15 and
// 17:45-18:45, Saturday 17:00-19:00, the long day on Sunday (Iker, 2026-10-21). Núi Dinh only by day; a night
// run is done in the park (Iker, 2026-10-22).
// A "day" starts at 04:00, not at midnight, like Haba: a press at 01:00 counts for the day before.

/** A day key looks like "2026-10-21". */
export type DayKey = string;

/** First day of the plan (the day Trani was made) and the race day. */
export const START: DayKey = '2026-10-21';
export const RACE: DayKey = '2026-12-27';
export const DAY_START_HOUR = 4;
/** Days after today that are planned and shown (Iker, 2026-10-22: "7 ngày tới"). */
export const AHEAD = 7;
/** The race page gets its own tab only in the race week (Iker, 2026-10-22). */
export const RACE_TAB_FROM: DayKey = '2026-12-21';

import type { Guide } from './guide.ts';
import type { VideoKey } from './videos.ts';

/** One exercise or one rule inside a session: what, how much, how (one line, or a list of short lines),
 *  for exercises the video (see videos.ts), and for core exercises the voice guide. */
export interface Step { name: string; dose?: string; note?: string | readonly string[]; video?: VideoKey; guide?: Guide }
/** eat: a meal or a snack. train: a training session. care: sleep, stretching, getting ready. */
export type Tag = 'eat' | 'train' | 'care';
export interface Item { time: string; tag: Tag; text: string; note?: string; steps?: readonly Step[] }
export interface Section { name: string; items: readonly Item[] }
/** rest: no running. A rest day with core can be marked done (Iker, 2026-10-26); one with no training cannot. */
export type Kind = 'train' | 'rest' | 'race';
/** why: one line under the title that says why the day is like this (for example lighter after a cramp). */
export interface Day { kind: Kind; title: string; week: string; why?: string; sections: readonly Section[] }

/** How a done day felt: the buttons under "done" (Iker, 2026-10-22). A cramp makes the next day lighter. */
export type Feel = 'easy' | 'ok' | 'hard' | 'cramp';
export const FEELS: readonly Feel[] = ['easy', 'ok', 'hard', 'cramp'];
export const FEEL_LABEL: Record<Feel, string> = { easy: 'Dễ', ok: 'Ổn', hard: 'Nặng', cramp: 'Chuột rút' };
export function isFeel(s: unknown): s is Feel { return typeof s === 'string' && (FEELS as readonly string[]).includes(s); }

// ---------- day maths ----------

function pad(n: number): string { return String(n).padStart(2, '0'); }

/** Local date of a Date object as "YYYY-MM-DD". */
function ymd(d: Date): DayKey {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function parseKey(key: DayKey): [number, number, number] {
  const p = key.split('-').map(Number);
  return [p[0] ?? 0, p[1] ?? 1, p[2] ?? 1];
}

export function isDayKey(s: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(s); }

/** Day key for a moment. Times before 04:00 count for the previous day. */
export function dayKey(t: Date): DayKey {
  const d = new Date(t.getTime());
  d.setHours(d.getHours() - DAY_START_HOUR);
  return ymd(d);
}

/** "Today" as a day key, using the same 04:00 rule. */
export function today(now?: Date): DayKey { return dayKey(now ?? new Date()); }

/** Day key shifted by n days (n may be negative). */
export function addDays(key: DayKey, n: number): DayKey {
  const [y, m, d] = parseKey(key);
  return ymd(new Date(y, m - 1, d + n, 12, 0, 0));
}

/** 0 for Monday up to 6 for Sunday. */
export function weekday(key: DayKey): number {
  const [y, m, d] = parseKey(key);
  return (new Date(y, m - 1, d, 12, 0, 0).getDay() + 6) % 7;
}

/** Monday of the week that holds the day key. */
export function weekStart(key: DayKey): DayKey { return addDays(key, -weekday(key)); }

/** Number of days from a to b (positive when b is later). */
export function daysBetween(a: DayKey, b: DayKey): number {
  const [y1, m1, d1] = parseKey(a);
  const [y2, m2, d2] = parseKey(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** 90 -> "1 tiếng 30 phút", 120 -> "2 tiếng", 45 -> "45 phút". */
export function dur(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} tiếng${m ? ` ${m} phút` : ''}` : `${m} phút`;
}

/** The day keys from today-before to today+after, in order. The page shows today and the next AHEAD days. */
export function windowKeys(todayKey: DayKey, before = 0, after = AHEAD): DayKey[] {
  const out: DayKey[] = [];
  for (let i = -before; i <= after; i++) out.push(addDays(todayKey, i));
  return out;
}

// ---------- recipes ----------
// A recipe is the short form of one day, saved as JSON in days/. expand() makes the full day out of it.

/** The evening session of a weekday. */
export type Pm =
  | { kind: 'intervals'; reps: number; work: number }
  | { kind: 'homeA'; sets: number; note?: string }
  | { kind: 'steady'; min: number; pack: number; easy?: boolean }
  | { kind: 'homeB'; sets: number; legs: boolean; note?: string }
  | { kind: 'run'; min: number; text?: string; note?: string }
  | { kind: 'trialAB' };
/** The morning of a weekday: an easy run (minutes), core at home, or nothing. */
export type Am = { run: number } | { core: number; text: string; note?: string } | null;
/** Sunday: a long run in the city (night: in the park from 03:00 with the headlamp), or Núi Dinh by day. */
export type Sunday = { long: number; night?: boolean } | { mountain: string; rehearsal?: boolean };

/** week: the label over the title. why: one line under the title. locked: the daily job never rewrites it. */
interface Base { date: DayKey; week: string; why?: string; locked?: boolean }
export type Recipe =
  | (Base & { type: 'rest'; coreSets: number; title?: string })
  | (Base & { type: 'weekday'; title?: string; am: Am; pm: Pm })
  | (Base & { type: 'saturday'; min: number; mountainTomorrow: boolean })
  | (Base & { type: 'sunday'; sun: Sunday })
  | (Base & { type: 'race' })
  | (Base & { type: 'custom'; day: Day });

// ---------- food ----------

// Meals only say how big they are (nhẹ, vừa, nặng) and what they are rich in (tinh bột, đạm).
// No dishes, no amounts: Iker chooses the food (2026-10-21).
const eat = (time: string, text: string, note?: string): Item => ({ time, tag: 'eat', text, note });
const AFTER = 'Ăn trong 30 phút sau buổi tập, để cơ hồi phục.';

const wake = (time: string): Item => ({
  time, tag: 'care', text: 'Thức dậy. Uống 1 ly nước.',
  note: 'Mang theo chai nước, uống từng ngụm nhỏ cả ngày, khoảng 2 lít.',
});
const rollout = (time = '21:30'): Item => ({
  time, tag: 'care', text: 'Lăn foam roller 10 phút: đùi trước, bắp chân, mặt ngoài đùi (IT Band). Mát-xa nhẹ tay và vai.',
});
const sleep = (time = '22:30'): Item => ({ time, tag: 'care', text: 'Đi ngủ. Ngủ đủ 7 - 8 tiếng.' });
const recovery = eat('Sau chạy', 'Ngay sau khi chạy xong: ăn nhẹ, tinh bột và đạm.', AFTER);

// ---------- sessions ----------
// Every exercise has a detailed "how to" (a list of short lines). The page shows it when Iker taps the exercise.

const PLANK = [
  'Nằm sấp. Chống hai khuỷu tay xuống sàn, ngay dưới vai. Nhón mũi chân để nâng người lên.',
  'Giữ người thẳng một đường từ đầu đến gót chân, như một tấm ván.',
  'Siết bụng, như sắp có người đấm vào bụng. Siết mông. Mắt nhìn xuống sàn.',
  'Thở đều, không nín thở.',
  'Lỗi hay gặp: mông chổng cao, hoặc hông võng xuống làm đau lưng dưới.',
  'Dễ hơn: chống gối xuống sàn thay vì mũi chân.',
];
const SIDE_PLANK = [
  'Nằm nghiêng. Khuỷu tay dưới chống ngay dưới vai. Hai chân duỗi thẳng, chồng lên nhau.',
  'Nâng hông lên, đến khi người thẳng một đường từ đầu đến chân. Tay trên chống hông.',
  'Giữ hông cao, không để hông xệ xuống. Thở đều.',
  'Làm hết thời gian một bên, rồi đổi bên.',
  'Dễ hơn: co gối dưới và chống gối xuống sàn.',
];
// The voice says the next number every 6 seconds (dead bug, bird dog) or 5 seconds (bridge): time to move out,
// hold 2 seconds and come back (Iker, 2026-10-22: 3 seconds was too fast to hold).
const VOICE_HOLD = 'Khi tập cùng giọng đọc: nghe số thì duỗi ra, giữ 2 giây, rồi thu về. Số tiếp theo đến sau 6 giây. Đếm đến 20 là xong 10 lần mỗi bên.';
const DEAD_BUG = [
  'Nằm ngửa. Hai tay giơ thẳng lên trần nhà.',
  'Co hai chân lên: gối vuông góc, cẳng chân song song với sàn.',
  'Ép lưng dưới sát sàn, không để khe hở. Giữ như vậy suốt bài.',
  'Từ từ duỗi tay phải ra sau đầu, đồng thời duỗi chân trái ra trước, xuống gần sàn. Thở ra khi duỗi. Giữ 2 giây.',
  'Đưa tay và chân về chỗ cũ, rồi đổi bên: tay trái và chân phải. Mỗi bên là 1 lần.',
  'Lỗi hay gặp: lưng dưới cong lên khỏi sàn. Nếu vậy, duỗi tay chân ít hơn và làm chậm hơn.',
  VOICE_HOLD,
];
const BIRD_DOG = [
  'Quỳ bốn chân: hai tay ngay dưới vai, hai gối ngay dưới hông. Lưng phẳng như mặt bàn.',
  'Duỗi thẳng tay phải ra trước và chân trái ra sau, đến khi cả hai song song với sàn.',
  'Giữ 2 giây. Siết bụng để hông không xoay, lưng không võng.',
  'Đưa về chỗ cũ, rồi đổi bên: tay trái và chân phải.',
  'Mẹo: tưởng tượng có ly nước đặt trên lưng, đừng để đổ.',
  VOICE_HOLD,
];
const BRIDGE = [
  'Nằm ngửa, co gối. Hai bàn chân đặt trên sàn, rộng bằng hông, gót chân gần mông. Tay xuôi theo người.',
  'Đẩy gót chân xuống sàn, siết mông, nâng hông lên đến khi người thẳng một đường từ vai đến gối.',
  'Giữ 1 - 2 giây ở trên, rồi hạ xuống chậm.',
  'Bạn phải thấy mỏi ở mông, không phải ở lưng. Không ưỡn lưng quá cao.',
  'Cơ mông là cơ chính đẩy người lên khi leo dốc.',
  'Khi tập cùng giọng đọc: nghe số thì nâng lên, giữ 2 giây, rồi hạ xuống. Số tiếp theo đến sau 5 giây.',
];
/** Seconds between two numbers of the voice: out, hold 2 seconds, back. */
const PACE_HOLD = 6;
const PACE_BRIDGE = 5;

/** Plank and side plank seconds by week (start week, weeks 1-8, race week): they grow, and drop in the lighter weeks. */
const PLAN_MONDAY: DayKey = '2026-10-19';
const PLANK_SEC = [30, 30, 35, 40, 30, 45, 45, 45, 30, 30];
const SIDE_SEC = [20, 20, 25, 25, 20, 30, 30, 30, 20, 20];
/** 0 for the start week up to 9 for the race week. */
export function weekIndex(key: DayKey): number {
  return Math.min(PLANK_SEC.length - 1, Math.max(0, Math.floor(daysBetween(PLAN_MONDAY, key) / 7)));
}
const plankSec = (key: DayKey): number => PLANK_SEC[weekIndex(key)] ?? 30;
const sideSec = (key: DayKey): number => SIDE_SEC[weekIndex(key)] ?? 20;

function core(sets: number, key: DayKey): Step[] {
  return [
    { name: 'Plank thẳng', dose: `${sets} x ${plankSec(key)} giây`, note: PLANK, video: 'plank', guide: { ex: 'plank', sets, hold: plankSec(key) } },
    { name: 'Plank nghiêng (Side Plank)', dose: `${sets} x ${sideSec(key)} giây mỗi bên`, note: SIDE_PLANK, video: 'side',
      guide: { ex: 'side', sets, hold: sideSec(key) } },
    { name: 'Dead Bug', dose: `${sets} x 10 mỗi bên`, note: DEAD_BUG, video: 'deadbug', guide: { ex: 'deadbug', sets, reps: 20, pace: PACE_HOLD } },
    { name: 'Bird Dog', dose: `${sets} x 10 mỗi bên`, note: BIRD_DOG, video: 'birddog', guide: { ex: 'birddog', sets, reps: 20, pace: PACE_HOLD } },
    { name: 'Glute Bridge', dose: `${sets} x 15`, note: BRIDGE, video: 'bridge', guide: { ex: 'bridge', sets, reps: 15, pace: PACE_BRIDGE } },
  ];
}

const easyRun = (min: number, time = '7:30'): Item => ({
  time, tag: 'train', text: `Chạy dễ ${dur(min)} (Z2).`, note: 'Đường bằng. Thở nhẹ, nói chuyện được cả câu.',
});
const preRun = eat('6:50', 'Ăn thật nhẹ trước khi chạy: một chút tinh bột.');

const STAIRS_HOW = [
  'Lên: bước 2 bậc một. Đặt cả bàn chân lên bậc. Người hơi nghiêng về trước, đẩy người lên bằng mông và đùi.',
  'Tay đánh mạnh theo nhịp chân, như khi chống gậy.',
  'Xuống: đi từng bậc, nhẹ nhàng, nhìn bậc. Không nhảy, để giữ gối.',
];
const COOL_DOWN = ['Đi bộ chậm.', 'Giãn bắp chân và đùi trước, mỗi bên 30 giây.'];

function intervals(reps: number, work: number): Item {
  return {
    time: '17:45', tag: 'train', text: `Leo dốc biến tốc trên cầu thang: ${reps} lần x ${work} phút.`,
    steps: [
      { name: 'Khởi động', dose: '10 phút', note: ['Chạy chậm 5 phút.', 'Lên xuống cầu thang nhẹ nhàng 5 phút.'] },
      { name: 'Lên xuống cầu thang liên tục, mức nặng (Z4)', dose: `${reps} lần x ${work} phút`,
        note: [...STAIRS_HOW, 'Mức nặng (Z4): thở rất mạnh, chỉ nói được vài chữ.'] },
      { name: 'Nghỉ sau mỗi lần', dose: '2 phút', note: ['Đi bộ chậm hoặc đứng thở.', 'Uống vài ngụm nước.'] },
      { name: 'Thả lỏng', dose: '5 phút', note: COOL_DOWN },
    ],
    note: 'Muốn đổi không khí: chạy lên một cây cầu gần nhà ở mức nặng, rồi chạy chậm xuống để nghỉ.',
  };
}

function steady(min: number, pack: number, easy = false): Item {
  const level = easy ? 'dễ (Z2)' : 'vừa (Z3)';
  const steps: Step[] = [
    { name: 'Khởi động', dose: '5 phút', note: ['Lên xuống cầu thang thật nhẹ.'] },
    { name: `Lên xuống liên tục, mức ${level}`, dose: `${min} phút`, note: [
      ...STAIRS_HOW,
      easy ? 'Mức dễ (Z2): thở nhẹ, nói chuyện được cả câu.' : 'Mức vừa (Z3): thở mạnh hơn, chỉ nói được câu ngắn. Giữ đều từ đầu đến cuối.',
      '1 tầng 20 bậc cao khoảng 3 mét. 45 phút là khoảng 70 - 80 lượt.',
    ] },
  ];
  if (pack) {
    steps.push({ name: `Đeo ba lô chạy trail có ${pack} chai nước`, note: [
      `Khoảng ${pack} kg.`, 'Giống ngày đua, vì trong giải bạn cũng đeo ba lô.', 'Chỉnh dây ba lô cho chặt, để ba lô không lắc.',
    ] });
  }
  steps.push({ name: 'Thả lỏng', dose: '5 phút', note: COOL_DOWN });
  return {
    time: '17:45', tag: 'train', text: `Leo cầu thang đều ${min} phút, mức ${level}.`, steps,
    note: easy ? 'Lần đầu: tập nhẹ để làm quen.' : 'Muốn đổi không khí: leo lên xuống một cây cầu gần nhà.',
  };
}

const STEP_UP = [
  'Đứng trước cầu thang. Đặt cả bàn chân phải lên bậc thứ 2.',
  'Người hơi nghiêng về trước, như khi leo dốc. Đẩy gót chân ở trên xuống để đứng thẳng lên.',
  'Chân dưới chỉ đi theo, không nhún hay bật lên.',
  'Hạ xuống chậm, vẫn dùng chân ở trên. Làm hết số lần một chân, rồi đổi chân.',
  'Gối chân trên hướng theo mũi chân, không đổ vào trong.',
  'Mất thăng bằng thì bám nhẹ tay vịn. Khi thấy dễ: đeo ba lô có vài chai nước.',
];
const SPLIT_SQUAT = [
  'Đứng quay lưng về ghế hoặc sofa, cách khoảng một bước dài. Gác mu bàn chân sau lên ghế.',
  'Hạ người thẳng xuống thật chậm, đếm 3 giây, đến khi đùi chân trước gần song song với sàn.',
  'Đẩy gót chân trước xuống sàn để đứng lên.',
  'Gối chân trước hướng theo mũi chân, không đổ vào trong. Lưng thẳng.',
  'Mỏi đùi trước và mông của chân trước là đúng. Hạ chậm giúp đùi trước chịu được đổ dốc lâu.',
  'Dễ hơn: hạ ít hơn, hoặc một tay vịn tường.',
];
const BAND_SQUAT = [
  'Đứng lên giữa dây dài, hai chân rộng bằng vai. Hai tay giữ hai đầu dây ở ngang vai.',
  'Ngồi xuống như ngồi ghế: đẩy mông ra sau, lưng thẳng, ngực mở.',
  'Xuống đến khi đùi song song với sàn, hoặc thấp nhất mà lưng vẫn thẳng.',
  'Đẩy gót chân để đứng lên. Gối hướng theo mũi chân.',
  'Dây quá nặng thì tập không có dây.',
];
const SIDE_WALK = [
  'Đeo dây ngắn ngay trên gối (dễ hơn) hoặc quanh cổ chân (khó hơn).',
  'Đứng hai chân rộng bằng hông. Hơi khuỵu gối, mông hơi đẩy ra sau, lưng thẳng.',
  'Bước chân phải sang ngang một bước vừa, rồi chân trái bước theo. Dây luôn căng, hai chân không chạm nhau.',
  '10 bước sang phải, rồi 10 bước sang trái là 1 lần.',
  'Gối không đổ vào trong. Mỏi ở mặt ngoài hông và mông là đúng. Cơ này giúp gối vững khi đổ dốc.',
];
const CALF = [
  'Đứng một chân trên mép bậc thang: nửa trước bàn chân trên bậc, gót chân thả ra ngoài. Tay vịn tường hoặc tay vịn.',
  'Gối thẳng. Nhón lên cao nhất có thể, giữ 1 giây.',
  'Hạ gót xuống thật chậm, đếm 3 giây, xuống thấp hơn mặt bậc một chút.',
  'Làm hết số lần một chân, rồi đổi chân.',
  'Bài này làm khỏe bắp chân, giúp bớt chuột rút khi leo.',
];

function homeA(sets: number, key: DayKey): Step[] {
  const c = Math.min(2, sets);   // the short core part at the end: 2 sets at most, 1 on the trial day
  return [
    { name: 'Khởi động', dose: '5 phút', note: ['Lên xuống cầu thang thật nhẹ nhàng 3 phút.', 'Xoay hông, xoay gối, xoay cổ chân, mỗi chỗ 10 vòng.'] },
    { name: 'Bước lên bậc (Step-up)', dose: `${sets} x 12 mỗi chân`, note: STEP_UP, video: 'stepup' },
    { name: 'Bulgarian Split Squat', dose: `${sets} x 10 mỗi chân`, note: SPLIT_SQUAT, video: 'split' },
    { name: 'Squat với dây dài', dose: `${sets} x 15`, note: BAND_SQUAT, video: 'bandsquat' },
    { name: 'Bước ngang với dây ngắn', dose: `${sets} lần x 10 bước mỗi bên`, note: SIDE_WALK, video: 'sidewalk' },
    { name: 'Nhón gót một chân trên bậc thang', dose: `${sets} x 12 mỗi chân`, note: CALF, video: 'calf' },
    { name: 'Core: Plank', dose: `${sets} x ${plankSec(key)} giây`, note: PLANK, video: 'plank', guide: { ex: 'plank', sets, hold: plankSec(key) } },
    { name: 'Core: Plank nghiêng', dose: `${c} x ${sideSec(key)} giây mỗi bên`, note: SIDE_PLANK, video: 'side', guide: { ex: 'side', sets: c, hold: sideSec(key) } },
    { name: 'Core: Dead Bug', dose: `${c} x 10 mỗi bên`, note: DEAD_BUG, video: 'deadbug', guide: { ex: 'deadbug', sets: c, reps: 20, pace: PACE_HOLD } },
  ];
}

// The band is tied before this first arm exercise; it is not an exercise of its own (Iker, 2026-10-24).
const STRAIGHT_ARM = [
  'Trước hết, vòng hoặc buộc dây dài vào chỗ chắc, cao hơn đầu: song sắt cửa sổ, hoặc lan can cầu thang ở trên. Xem dây có vết nứt không.',
  'Đứng đối diện chỗ buộc, lùi ra đến khi dây hơi căng. Hai tay nắm dây ở ngang mặt, tay thẳng, khuỷu hơi chùng.',
  'Người hơi nghiêng về trước, siết bụng.',
  'Giữ tay thẳng, kéo dây xuống theo hình vòng cung đến ngang hông.',
  'Giữ 1 giây, rồi đưa tay lên chậm.',
  'Bạn phải thấy cơ lưng dưới nách làm việc (cơ lưng xô). Không gập khuỷu tay, không giật bằng cả người.',
  'Đây là động tác giống chống gậy nhất.',
];
const PUSHDOWN = [
  'Đứng đối diện chỗ buộc. Hai tay nắm dây, khuỷu tay gập, ép sát hai bên sườn.',
  'Chỉ duỗi cẳng tay xuống, đến khi tay thẳng. Giữ 1 giây, siết mặt sau cánh tay.',
  'Đưa lên chậm. Khuỷu tay đứng yên, không đưa ra trước.',
  'Cơ mặt sau cánh tay là cơ đẩy gậy xuống.',
];
const ROW = [
  'Buộc dây ngang ngực. Hoặc ngồi duỗi chân, vòng dây qua lòng bàn chân.',
  'Hai tay nắm dây, tay thẳng phía trước. Lưng thẳng, ngực mở.',
  'Kéo dây về phía bụng, khuỷu tay đi sát người ra sau. Ép hai bả vai lại với nhau.',
  'Giữ 1 giây, rồi duỗi tay ra chậm.',
  'Không nhún vai lên tai.',
];
const POLING = [
  'Đứng đối diện chỗ buộc. Mỗi tay nắm một bên dây, tay đưa ra trước ngang ngực, như vừa cắm gậy.',
  'Kéo tay phải xuống và ra sau đến ngang hông, tay gần thẳng, như đẩy gậy.',
  'Khi tay phải đưa về, tay trái kéo xuống. Đổi tay liên tục, nhịp đều như khi leo dốc.',
  'Tay nắm nhẹ, không nắm chặt.',
  'Làm liên tục 2 phút, nghỉ 1 phút. Bài này giúp tay quen làm việc lâu.',
];
const PUSHUP = [
  'Hai tay chống sàn, rộng hơn vai một chút. Người thẳng từ đầu đến gót, như Plank.',
  'Hạ ngực xuống gần sàn. Khuỷu tay chếch ra sau, không bè ra hai bên.',
  'Đẩy lên đến khi tay thẳng. Thở ra khi đẩy lên.',
  'Dễ hơn: chống gối, hoặc chống tay lên bậc thang.',
];
const DIPS = [
  'Ngồi trên mép một cái ghế chắc, không có bánh xe. Hai tay chống mép ghế cạnh hông, ngón tay hướng ra trước.',
  'Đẩy mông ra khỏi ghế. Gối gập vuông góc, bàn chân đặt trên sàn.',
  'Gập khuỷu tay để hạ người xuống, đến khi khuỷu tay vuông góc. Lưng gần sát ghế.',
  'Đẩy lên bằng mặt sau cánh tay.',
  'Khó hơn: duỗi thẳng chân. Nếu đau vai, hạ ít hơn.',
];
const BENT_CALF = [
  'Đứng một chân trên mép bậc thang, giống bài nhón gót, nhưng gối hơi gập và giữ gập suốt bài.',
  'Nhón lên cao, giữ 1 giây, rồi hạ gót xuống chậm.',
  'Làm hết số lần một chân, rồi đổi chân.',
  'Bài này tập phần cơ sâu của bắp chân (cơ dép). Cơ này làm việc nhiều khi leo dốc và hay bị chuột rút.',
];
const BAND_BRIDGE = ['Đeo dây ngắn ngay trên gối.', ...BRIDGE.slice(0, 3), 'Trong suốt bài, đẩy hai gối ra ngoài, chống lại dây.', BRIDGE[5]!];

function homeB(sets: number, withLegs: boolean): Step[] {
  const steps: Step[] = [
    { name: 'Khởi động', dose: '3 phút', note: ['Xoay vai ra trước 10 lần, ra sau 10 lần.', 'Xoay cánh tay thành vòng tròn 10 lần.', 'Làm 1 hiệp hít đất nhẹ, có thể chống gối.'] },
    { name: 'Kéo dây thẳng tay', dose: `${sets} x 15 - 20`, note: STRAIGHT_ARM, video: 'straightarm' },
    { name: 'Đẩy dây tay sau', dose: `${sets} x 15 - 20`, note: PUSHDOWN, video: 'pushdown' },
    { name: 'Kéo dây về bụng', dose: `${sets} x 15`, note: ROW, video: 'row' },
    { name: 'Chống gậy với dây', dose: `${sets} lần x 2 phút`, note: POLING, video: 'poling' },
    { name: 'Hít đất', dose: `${sets} x 10 - 15`, note: PUSHUP, video: 'pushup' },
    { name: 'Chống tay sau ghế (Tricep Dips)', dose: `${sets} x 10 - 15`, note: DIPS, video: 'dips' },
  ];
  if (withLegs) steps.push({ name: 'Nhón gót gối gập', dose: `${sets} x 15 mỗi chân`, note: BENT_CALF, video: 'bentcalf' });
  steps.push(
    { name: 'Core: Bird Dog', dose: `${sets} x 10 mỗi bên`, note: BIRD_DOG, video: 'birddog', guide: { ex: 'birddog', sets, reps: 20, pace: PACE_HOLD } },
    { name: 'Core: Glute Bridge với dây ngắn', dose: `${sets} x 15`, note: BAND_BRIDGE, video: 'bandbridge', guide: { ex: 'bandbridge', sets, reps: 15, pace: PACE_BRIDGE } },
  );
  return steps;
}
const BAND_NOTE = 'Đứng xa chỗ buộc thì dây căng hơn, nặng hơn. Chọn khoảng cách sao cho làm xong số lần vẫn còn sức thêm 2 - 3 lần.';

/** 2026-10-23: sessions A and B tried in one evening, 1 set of every exercise, to learn the moves. One warm-up at the
 *  start (legs and shoulders); no second warm-up in the middle (Iker, 2026-10-22). */
function trialAB(key: DayKey): Item {
  const a = homeA(1, key), b = homeB(1, true);
  const warmUp: Step = { name: 'Khởi động', dose: '5 phút', note: [
    'Lên xuống cầu thang thật nhẹ nhàng 3 phút.', 'Xoay hông, xoay gối, xoay cổ chân, mỗi chỗ 10 vòng.', 'Xoay vai ra trước 10 lần, ra sau 10 lần.',
  ] };
  return {
    time: '17:45', tag: 'train', text: 'Tập thử Bài ở nhà A và Bài ở nhà B: mỗi bài 1 hiệp, tập nhẹ để học động tác. Khoảng 40 phút.',
    steps: [warmUp, ...a.slice(1), ...b.slice(1)], note: BAND_NOTE,
  };
}

const satRun = (min: number): Item => ({
  time: '17:00', tag: 'train', text: `Chạy ${dur(min)} ở chỗ có dốc (cầu, dốc hầm), mức dễ (Z2).`,
  note: 'Lên dốc thì đi bộ nhanh hoặc chạy chậm. Mang theo nước.',
});

// Salt and food every hour: cramps came at about hour 5 in both slow races (Iker, 2026-10-22).
const EAT_DRINK: Step[] = [
  { name: 'Ăn', dose: 'mỗi 30 - 45 phút', note: 'Một chút tinh bột dễ ăn, khoảng 60 g tinh bột mỗi giờ. Ăn ngay từ giờ đầu, như ngày đua.' },
  { name: 'Uống', dose: '400 - 600 ml mỗi giờ', note: 'Uống theo cơn khát. 1 viên điện giải mỗi giờ, 2 viên khi trời nóng. Muối đều đặn giúp bớt chuột rút.' },
];

const longRun = (min: number, night: boolean): Item => ({
  time: night ? '3:00' : '5:45', tag: 'train',
  text: night ? `Chạy dài ${dur(min)} trong công viên, bắt đầu lúc 3 giờ sáng với đèn đội đầu, mức dễ (Z2).`
    : `Chạy dài ${dur(min)}, mức dễ (Z2), có cầu và dốc.`,
  note: night ? 'Giống 4 tiếng đầu của giải: chạy trong đêm, trời còn tối. Chỉ ở công viên, không lên núi ban đêm.' : undefined,
  steps: [{ name: 'Chạy đều mức dễ (Z2)', dose: dur(min), note: 'Lên cầu thì đi bộ nhanh hoặc chạy chậm. Không để nhịp tim lên Z4.' }, ...EAT_DRINK],
});

const mountain = (hours: string, rehearsal: boolean): Item => ({
  time: '6:00', tag: 'train', text: `Chạy Núi Dinh ${hours}.`,
  steps: [
    { name: 'Leo đều, mức dễ đến vừa (Z2 - Z3)', note: ['Không lên Z4. Bước ngắn và đều.', 'Dốc cao: đi bộ nhanh, có thể chống tay lên đùi.', 'Không bung sức sớm. Nửa đầu chậm là cách tốt nhất để không chuột rút.'] },
    { name: 'Chống gậy đúng cách', note: [
      'Nếu gậy có quai: luồn tay từ dưới lên qua quai, rồi cầm cán gậy đè lên quai.',
      'Khi đẩy, đè lực xuống quai. Tay chỉ cầm nhẹ, không nắm chặt. Nắm chặt là lý do chính làm tay mau mỏi.',
      'Cắm gậy gần chân, ngang hoặc hơi trước bàn chân. Không vươn gậy ra xa.',
      'Đẩy bằng cả lưng và thân người, không chỉ bằng tay.',
    ] },
    { name: 'Đổ dốc nhanh nhưng kiểm soát', note: ['Bước ngắn và nhanh. Nhìn trước vài mét.', 'Không chạy hết tốc, để giữ sức cho đùi trước.'] },
    { name: 'Không về sớm', note: ['Giải kết thúc vào buổi trưa nắng.', '1 - 2 tiếng cuối trong nắng là có mục đích: tập cho quen.', 'Đội nón, uống nhiều hơn, dội nước lên đầu và gáy.'] },
    ...EAT_DRINK,
  ],
  note: rehearsal ? 'Buổi tập thử cho ngày đua: dùng đúng giày, gậy, ba lô, tô muỗng và đồ ăn sẽ dùng trong giải.' : undefined,
});

// ---------- days ----------

function restDay(week: string, title: string, coreSets: number, key: DayKey): Day {
  return {
    kind: 'rest', title, week,
    sections: [
      { name: 'Sáng', items: [wake('6:30'), eat('7:30', 'Ăn sáng vừa: tinh bột và đạm.')] },
      { name: 'Trưa', items: [eat('12:00', 'Ăn trưa vừa: nhiều đạm và rau, ít tinh bột.', 'Hôm nay không chạy, nên ăn ít tinh bột hơn ngày tập.'),
        eat('16:00', 'Ăn nhẹ, nếu đói.')] },
      { name: 'Tối', items: [
        { time: '17:45', tag: 'train', text: coreSets >= 3 ? 'Bài core ở nhà 15 phút, rồi giãn cơ 15 phút.' : 'Core nhẹ ở nhà 10 phút, rồi giãn cơ.', steps: core(coreSets, key) },
        eat('19:00', 'Ăn tối vừa: nhiều đạm và rau, ít tinh bột.'), rollout(), sleep(),
      ] },
    ],
  };
}

/** A weekday: in the morning an easy run (minutes), or another session at home, or nothing (0); one session in the evening. */
function weekdayDay(week: string, title: string, evening: Item, am: number | Item): Day {
  const morning = typeof am !== 'number' ? [wake('6:30'), am, eat('7:45', 'Ăn sáng vừa: tinh bột và đạm.')]
    : am ? [wake('6:30'), preRun, easyRun(am), eat('8:30', 'Ăn sáng vừa: nhiều tinh bột, có đạm.', 'Ăn trong 30 phút sau khi chạy.')]
    : [wake('6:30'), eat('7:30', 'Ăn sáng vừa: tinh bột và đạm.')];
  return {
    kind: 'train', title, week,
    sections: [
      { name: 'Sáng', items: morning },
      { name: 'Trưa', items: [eat('12:00', 'Ăn trưa vừa: nhiều tinh bột, có đạm và rau.'),
        eat('16:30', 'Ăn nhẹ trước buổi tập: một chút tinh bột dễ tiêu.')] },
      { name: 'Tối', items: [evening, eat('19:00', 'Ăn tối nặng: nhiều tinh bột và nhiều đạm, có rau.', AFTER), rollout(), sleep()] },
    ],
  };
}

/** Core is done at home in the morning, never in the park (Iker cannot lie down there) and never after dinner (2026-10-21). */
const coreAtHome = (key: DayKey, sets: number, text: string, note?: string): Item => ({ time: '7:30', tag: 'train', text, steps: core(sets, key), note });

function saturdayDay(week: string, min: number, mountainTomorrow: boolean): Day {
  return {
    kind: 'train', title: `Chạy có dốc ${dur(min)}`, week,
    sections: [
      { name: 'Sáng', items: [wake('7:00'), eat('7:30', 'Ăn sáng vừa: tinh bột và đạm.'),
        { time: '9:00', tag: 'care', text: 'Buổi sáng nghỉ. Đi bộ nhẹ nếu muốn.' }] },
      { name: 'Trưa', items: [eat('12:00', 'Ăn trưa vừa: nhiều tinh bột, có đạm và rau.'),
        eat('15:30', 'Ăn nhẹ trước buổi chạy: một chút tinh bột dễ tiêu.')] },
      { name: 'Tối', items: [
        satRun(min),
        eat('19:15', 'Ăn tối nặng: nhiều tinh bột, có đạm.', AFTER + ' Ăn nhiều tinh bột hơn bình thường, vì ngày mai chạy dài.'),
        { time: '21:00', tag: 'care', text: 'Chuẩn bị đồ cho ngày mai.', note: mountainTomorrow
          ? 'Gậy, ba lô, 1,5 - 2 lít nước, đồ ăn khi chạy, viên điện giải, nón, điện thoại và đồng hồ sạc đầy.'
          : 'Nước, đồ ăn khi chạy, viên điện giải, đồng hồ sạc đầy.' },
        sleep('22:00'),
      ] },
    ],
  };
}

function sundayDay(week: string, s: Sunday): Day {
  const isLong = 'long' in s;
  let morning: Item[], title: string;
  if (!('long' in s)) {
    morning = [{ time: '4:00', tag: 'care', text: 'Thức dậy. Uống 1 ly nước.', note: 'Giờ có thể đổi tùy đường đi. Bắt đầu chạy lúc trời vừa sáng.' },
      eat('4:15', 'Ăn sáng vừa: nhiều tinh bột, ít dầu mỡ. Ăn trên xe cũng được.', 'Ăn 1,5 - 2 tiếng trước khi bắt đầu chạy.'),
      mountain(s.mountain, s.rehearsal ?? false), recovery];
    title = `Núi Dinh ${s.mountain}`;
  } else if (s.night) {
    morning = [{ time: '2:00', tag: 'care', text: 'Thức dậy. Uống 1 ly nước.', note: 'Tối hôm trước đi ngủ lúc 20:00. Đèn đội đầu sạc đầy.' },
      eat('2:15', 'Ăn sáng nhẹ: tinh bột dễ tiêu, ít dầu mỡ.'), longRun(s.long, true), recovery];
    title = `Chạy dài ${dur(s.long)} trong đêm`;
  } else {
    morning = [wake('4:45'), eat('5:00', 'Ăn sáng nhẹ: tinh bột dễ tiêu, ít dầu mỡ.'), longRun(s.long, false), recovery];
    title = `Chạy dài ${dur(s.long)}`;
  }
  return {
    kind: 'train', title, week,
    sections: [
      { name: 'Sáng', items: morning },
      { name: 'Trưa', items: [eat(isLong ? '11:30' : '12:30', 'Ăn trưa nặng: nhiều tinh bột và nhiều đạm.'),
        { time: isLong ? '12:30' : '14:00', tag: 'care', text: isLong ? 'Ngủ trưa 30 phút.' : 'Về nhà ngủ trưa 30 - 60 phút.' }] },
      { name: 'Tối', items: [
        { time: '17:30', tag: 'care', text: 'Đi bộ nhẹ 15 - 20 phút cho chân đỡ cứng.' },
        eat('19:00', 'Ăn tối vừa: nhiều đạm, có tinh bột và rau.'), rollout(), sleep('22:00'),
      ] },
    ],
  };
}

/** What the organizer asks every 65 km runner to carry (Dinh Harvest Final 2026, read on 2026-10-22). */
export const RACE_GEAR = 'Bình hoặc túi nước 1,5 lít. Vest hoặc ba lô. Còi. Điện thoại. Túi sơ cứu: băng thun, gạc, băng cá nhân, thuốc giảm đau, chăn giữ nhiệt. Đèn đội đầu đủ sáng và pin dự phòng.';

/** The race day: Dinh Harvest Final 2026, 65 km, start 02:00, 16 hours (the organizer's page, 2026-10-22). */
export function raceDay(): Day {
  return {
    kind: 'race', title: 'Ngày đua: 65 km Núi Dinh', week: 'Dinh Harvest Final 2026 · Chủ nhật 27/12',
    sections: [
      { name: 'Thông tin giải', items: [
        { time: 'Xuất phát', tag: 'care', text: '02:00 tại Hồ Bên Suối. Tập trung 01:00 - 01:45, kiểm tra đồ bắt buộc.' },
        { time: 'Giới hạn', tag: 'care', text: 'Về đích trước 18:00. Giới hạn 16 tiếng.',
          note: 'Tức là trung bình 14 phút 45 giây mỗi km, tính cả lúc dừng ở trạm.' },
        { time: 'Mục tiêu', tag: 'train', text: 'Trung bình 13 phút mỗi km: về đích khoảng 14 tiếng, dư 2 tiếng.', note: 'Dừng ở mỗi trạm không quá 5 phút.' },
        { time: 'Leo', tag: 'care', text: 'Ban tổ chức chưa công bố số mét leo. Trang đăng ký ghi tạm khoảng 3.500 m.' },
        { time: 'Đêm', tag: 'care', text: '4 tiếng đầu chạy trong đêm, trời sáng khoảng 6 giờ.' },
        { time: 'Đồ bắt buộc', tag: 'care', text: RACE_GEAR, note: 'Thiếu đồ: bị cộng 30 phút hoặc bị loại.' },
        { time: 'Trạm', tag: 'eat', text: 'Trạm có cháo và nước ngọt. Mang tô, muỗng, ly của mình.', note: 'Túi gửi đồ ở Expo. Xe về thành phố từ 12:00 đến 18:30.' },
      ] },
      { name: 'Trước giờ xuất phát', items: [
        { time: '23:00', tag: 'care', text: 'Thức dậy, 3 tiếng trước giờ chạy. Uống 1 ly nước.' },
        { time: '23:30', tag: 'eat', text: 'Ăn sáng vừa: nhiều tinh bột, ít dầu mỡ, món quen.', note: 'Không thử món mới.' },
        { time: '01:00', tag: 'eat', text: 'Uống 300 - 500 ml nước có điện giải. Kiểm tra đồ lần cuối. Đến chỗ tập trung.' },
      ] },
      { name: 'Trong giải', items: [
        { time: 'Giờ 1 - 3', tag: 'train', text: 'Leo ở mức dễ (Z2). Dốc thì đi bộ nhanh, bước ngắn. Không đua với ai.',
          note: 'Nửa đầu chậm là cách tốt nhất để không chuột rút.' },
        { time: 'Gậy', tag: 'train', text: 'Dùng gậy từ con dốc đầu tiên. Luồn tay qua quai, cầm nhẹ.' },
        { time: 'Mỗi giờ', tag: 'eat', text: 'Ăn khoảng 60 g tinh bột dễ ăn. Ăn ngay từ giờ đầu.' },
        { time: 'Mỗi giờ', tag: 'eat', text: 'Uống theo cơn khát, khoảng 400 - 600 ml. 1 viên điện giải mỗi giờ, 2 viên khi trời nóng.' },
        { time: 'Giờ 3 - 5', tag: 'care', text: 'Chuột rút hay đến ở giờ thứ 5. Từ giờ thứ 3: chậm lại một chút, bước ngắn hơn khi leo, ăn và uống muối đều.' },
        { time: 'Chuột rút', tag: 'care', text: 'Đi chậm lại, bước ngắn hơn, ăn và uống. Giãn nhẹ cơ đó 20 - 30 giây, rồi đi tiếp thật chậm. Đừng dừng lại quá lâu.' },
        { time: 'Nửa sau', tag: 'train', text: 'Còn khỏe thì tăng dần. Đổ dốc nhanh nhưng không hết tốc, để giữ đùi trước.' },
        { time: 'Trưa', tag: 'care', text: 'Từ 11 giờ trời nắng. Đội nón, uống nhiều hơn, dội nước lên đầu và gáy ở trạm.' },
      ] },
      { name: 'Sau khi về đích', items: [
        { time: 'Ngay sau', tag: 'eat', text: 'Uống nước. Ăn nhẹ: tinh bột và đạm.' },
        { time: '1 - 2 tiếng sau', tag: 'eat', text: 'Ăn nặng: nhiều tinh bột và nhiều đạm.' },
        { time: 'Tuần sau', tag: 'care', text: 'Nghỉ chạy. Chỉ đi bộ nhẹ, ngủ nhiều.' },
      ] },
    ],
  };
}

// ---------- expand ----------

/** The title of a weekday from its evening session, when the recipe gives none. */
export function titleOf(pm: Pm): string {
  switch (pm.kind) {
    case 'intervals': return `Leo dốc biến tốc: ${pm.reps} lần x ${pm.work} phút`;
    case 'homeA': return 'Bài ở nhà A: chân và core';
    case 'steady': return `Leo cầu thang đều ${pm.min} phút`;
    case 'homeB': return pm.legs ? 'Bài ở nhà B: tay chống gậy' : 'Bài ở nhà B: tay và core (nhẹ)';
    case 'run': return `Chạy dễ ${dur(pm.min)}`;
    case 'trialAB': return 'Tập thử bài ở nhà A và B';
  }
}

function pmItem(pm: Pm, key: DayKey): Item {
  switch (pm.kind) {
    case 'intervals': return intervals(pm.reps, pm.work);
    case 'homeA': return { time: '17:45', tag: 'train', text: 'Bài ở nhà A: chân và core (khoảng 45 phút).', steps: homeA(pm.sets, key), note: pm.note };
    case 'steady': return steady(pm.min, pm.pack, pm.easy ?? false);
    case 'homeB': return {
      time: '17:45', tag: 'train',
      text: pm.legs ? 'Bài ở nhà B: tay chống gậy, bắp chân và core (khoảng 45 phút).' : 'Bài ở nhà B: chỉ tay và core, tập nhẹ.',
      steps: homeB(pm.sets, pm.legs), note: [pm.note, BAND_NOTE].filter(Boolean).join(' '),
    };
    case 'run': return { ...easyRun(pm.min, '17:45'), ...(pm.text ? { text: pm.text } : {}), ...(pm.note ? { note: pm.note } : {}) };
    case 'trialAB': return trialAB(key);
  }
}

/** The full day of a recipe. */
export function expand(r: Recipe): Day {
  let day: Day;
  switch (r.type) {
    case 'rest': day = restDay(r.week, r.title ?? (r.coreSets >= 3 ? 'Nghỉ chạy: core và giãn cơ' : 'Nghỉ. Core nhẹ.'), r.coreSets, r.date); break;
    case 'weekday': {
      const am = r.am === null ? 0 : 'run' in r.am ? r.am.run : coreAtHome(r.date, r.am.core, r.am.text, r.am.note);
      day = weekdayDay(r.week, r.title ?? titleOf(r.pm), pmItem(r.pm, r.date), am);
      break;
    }
    case 'saturday': day = saturdayDay(r.week, r.min, r.mountainTomorrow); break;
    case 'sunday': day = sundayDay(r.week, r.sun); break;
    case 'race': day = raceDay(); break;
    case 'custom': day = r.day; break;
  }
  return r.why ? { ...day, why: r.why } : day;
}

// ---------- the plan: the days that have a recipe ----------

/**
 * out: no recipe for this day. rest: a day with no training at all. done: marked done.
 * missed: in the past and not done. open: today and not done yet. future: later.
 */
export type State = 'out' | 'rest' | 'done' | 'missed' | 'open' | 'future';
export interface Summary { done: number; missed: number; daysToRace: number }

export interface Plan {
  readonly days: ReadonlyMap<DayKey, Day>;
  readonly recipes: ReadonlyMap<DayKey, Recipe>;
  dayOf(key: DayKey): Day | null;
  /** A day can be marked done when it has a recipe, has some training, and is not in the future. */
  canMark(key: DayKey, todayKey: DayKey): boolean;
  stateOf(key: DayKey, todayKey: DayKey, done: ReadonlySet<DayKey>): State;
  summary(todayKey: DayKey, done: ReadonlySet<DayKey>): Summary;
}

export function makePlan(recipes: readonly Recipe[]): Plan {
  const days = new Map<DayKey, Day>();
  const byKey = new Map<DayKey, Recipe>();
  for (const r of recipes) {
    if (!isDayKey(r.date)) throw new Error('bad recipe date: ' + r.date);
    byKey.set(r.date, r);
    days.set(r.date, expand(r));
  }
  const dayOf = (key: DayKey): Day | null => days.get(key) ?? null;
  const stateOf = (key: DayKey, todayKey: DayKey, done: ReadonlySet<DayKey>): State => {
    const d = days.get(key);
    if (!d) return 'out';
    if (!hasTraining(d)) return 'rest';
    if (key > todayKey) return 'future';
    if (done.has(key)) return 'done';
    return key < todayKey ? 'missed' : 'open';
  };
  return {
    days, recipes: byKey, dayOf, stateOf,
    canMark: (key, todayKey) => { const d = days.get(key); return !!d && hasTraining(d) && key <= todayKey; },
    summary: (todayKey, done) => {
      let nDone = 0, nMissed = 0;
      for (const k of days.keys()) {
        const s = stateOf(k, todayKey, done);
        if (s === 'done') nDone++;
        else if (s === 'missed') nMissed++;
      }
      return { done: nDone, missed: nMissed, daysToRace: daysBetween(todayKey, RACE) };
    },
  };
}

/** Iker, 2026-10-26: "Nghỉ chạy vẫn phải đánh dấu vì vẫn còn tập core." A day with any training item, a rest day
 *  with core included, is marked done like any other day. Only a day with no training at all (the gear day before the
 *  race) has nothing to mark. */
export function hasTraining(d: Day): boolean {
  return d.kind !== 'rest' || d.sections.some(s => s.items.some(i => i.tag === 'train'));
}

/** What a done day marks in Haba (Iker, 2026-10-21): "jog" when the day has running, "core" when it has core
 *  exercises (the ones with a voice guide). Stairs alone mark nothing. The race day is running. */
export function habaItems(d: Day): ('jog' | 'core')[] {
  if (d.kind === 'race') return ['jog'];
  const train = d.sections.flatMap(s => s.items).filter(i => i.tag === 'train');
  const out: ('jog' | 'core')[] = [];
  if (train.some(i => /chạy/i.test(i.text))) out.push('jog');
  if (train.some(i => (i.steps ?? []).some(st => st.guide))) out.push('core');
  return out;
}
