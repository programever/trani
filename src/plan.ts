// Trani: the training plan for the 65 km Núi Dinh race, and the day maths.
// No browser things in here, so it can also run under node for the tests (see test/plan.test.ts).
//
// Every day has three parts (Sáng, Trưa, Tối: morning, noon, evening). Each part is a list of what to
// eat and what to do, with a time. Iker follows the list as it is.
// The plan was written with Iker on 2026-10-21: training at home only (one floor of stairs and two
// resistance bands, no gym), weekdays 07:30-08:15 and 17:45-18:45, Saturday 17:00-19:00, the long day on Sunday.
// Weeks: a start week, weeks 1-3 build, week 4 lighter, weeks 5-7 build, week 8 and the race week lighter.
// A "day" starts at 04:00, not at midnight, like Haba: a press at 01:00 counts for the day before.

/** A day key looks like "2026-10-21". */
export type DayKey = string;

/** First day of the plan (the day Trani was made) and the race day. */
export const START: DayKey = '2026-10-21';
export const RACE: DayKey = '2026-12-27';
export const DAY_START_HOUR = 4;

import type { Guide } from './guide.ts';

/** One exercise or one rule inside a session: what, how much, how (one line, or a list of short lines),
 *  and for core exercises the voice guide. */
export interface Step { name: string; dose?: string; note?: string | readonly string[]; guide?: Guide }
/** eat: a meal or a snack. train: a training session. care: sleep, stretching, getting ready. */
export type Tag = 'eat' | 'train' | 'care';
export interface Item { time: string; tag: Tag; text: string; note?: string; steps?: readonly Step[] }
export interface Section { name: string; items: readonly Item[] }
/** rest days and future days cannot be marked done. */
export type Kind = 'train' | 'rest' | 'race';
export interface Day { kind: Kind; title: string; week: string; sections: readonly Section[] }

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

// ---------- the weeks ----------

type Sunday = { long: number } | { mountain: string; rehearsal?: boolean };

interface Week {
  label: string;           // shown above the day title
  short: string;           // shown in the calendar
  am: readonly number[];   // weekdays (0 = Monday) with an easy run in the morning
  amMin: number;
  reps: number;            // Tuesday stair intervals: reps x work minutes
  work: number;
  steady: number;          // Thursday steady stairs, minutes
  pack: number;            // backpack with this many 1 kg bottles of water on Thursday
  sets: number;            // sets of the home sessions
  sat: number;             // Saturday run, minutes
  sun: Sunday;
  homeNote?: string;
  lastLegs?: boolean;      // week 8: the last leg session, and the arms session without legs
}

const PLAN_MONDAY: DayKey = '2026-10-19';

const WEEKS: readonly Week[] = [
  { label: 'Tuần bắt đầu', short: 'Bắt đầu', am: [], amMin: 0, reps: 0, work: 0, steady: 30, pack: 0, sets: 2, sat: 90, sun: { long: 150 } },
  { label: 'Tuần 1', short: 'Tuần 1', am: [1, 4], amMin: 30, reps: 6, work: 3, steady: 35, pack: 0, sets: 3, sat: 90,
    sun: { mountain: '4 tiếng' }, homeNote: 'Tuần đầu: tập nhẹ, chú ý làm đúng động tác.' },
  { label: 'Tuần 2', short: 'Tuần 2', am: [1, 2, 4], amMin: 35, reps: 7, work: 3, steady: 40, pack: 0, sets: 3, sat: 120, sun: { long: 180 } },
  { label: 'Tuần 3', short: 'Tuần 3', am: [1, 2, 4], amMin: 40, reps: 8, work: 3, steady: 45, pack: 2, sets: 3, sat: 90,
    sun: { mountain: '5 tiếng' } },
  { label: 'Tuần 4 · tuần nhẹ', short: 'Tuần 4', am: [1, 4], amMin: 30, reps: 5, work: 3, steady: 30, pack: 2, sets: 2, sat: 90,
    sun: { long: 150 }, homeNote: 'Tuần nhẹ: mỗi bài bớt 1 hiệp.' },
  { label: 'Tuần 5', short: 'Tuần 5', am: [1, 2, 4], amMin: 40, reps: 6, work: 4, steady: 45, pack: 3, sets: 3, sat: 120, sun: { long: 210 } },
  { label: 'Tuần 6', short: 'Tuần 6', am: [1, 2, 4], amMin: 40, reps: 7, work: 4, steady: 50, pack: 3, sets: 3, sat: 60,
    sun: { mountain: '6 - 7 tiếng', rehearsal: true } },
  { label: 'Tuần 7 · tuần nặng nhất', short: 'Tuần 7', am: [1, 2, 4], amMin: 40, reps: 8, work: 4, steady: 50, pack: 3, sets: 3, sat: 120,
    sun: { long: 180 } },
  { label: 'Tuần 8 · bắt đầu giảm', short: 'Tuần 8', am: [1, 4], amMin: 30, reps: 5, work: 3, steady: 30, pack: 0, sets: 2, sat: 60,
    sun: { long: 120 }, lastLegs: true },
  { label: 'Tuần đua', short: 'Tuần đua', am: [], amMin: 0, reps: 0, work: 0, steady: 0, pack: 0, sets: 2, sat: 0, sun: { long: 0 } },
];

function weekOf(key: DayKey): { w: Week; n: number } {
  const n = Math.min(WEEKS.length - 1, Math.max(0, Math.floor(daysBetween(PLAN_MONDAY, key) / 7)));
  return { w: WEEKS[n] ?? WEEKS[0]!, n };
}

/** Calendar label of each row of weeks(). */
export const WEEK_LABELS: readonly string[] = WEEKS.map(w => w.short);

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
const DEAD_BUG = [
  'Nằm ngửa. Hai tay giơ thẳng lên trần nhà.',
  'Co hai chân lên: gối vuông góc, cẳng chân song song với sàn.',
  'Ép lưng dưới sát sàn, không để khe hở. Giữ như vậy suốt bài.',
  'Từ từ duỗi tay phải ra sau đầu, đồng thời duỗi chân trái ra trước, xuống gần sàn. Thở ra khi duỗi.',
  'Đưa tay và chân về chỗ cũ, rồi đổi bên: tay trái và chân phải. Mỗi bên là 1 lần.',
  'Lỗi hay gặp: lưng dưới cong lên khỏi sàn. Nếu vậy, duỗi tay chân ít hơn và làm chậm hơn.',
  'Khi tập cùng giọng đọc: mỗi số là 1 lần, đổi bên mỗi lần. Đếm đến 20 là xong 10 lần mỗi bên.',
];
const BIRD_DOG = [
  'Quỳ bốn chân: hai tay ngay dưới vai, hai gối ngay dưới hông. Lưng phẳng như mặt bàn.',
  'Duỗi thẳng tay phải ra trước và chân trái ra sau, đến khi cả hai song song với sàn.',
  'Giữ 2 giây. Siết bụng để hông không xoay, lưng không võng.',
  'Đưa về chỗ cũ, rồi đổi bên: tay trái và chân phải.',
  'Mẹo: tưởng tượng có ly nước đặt trên lưng, đừng để đổ.',
  'Khi tập cùng giọng đọc: mỗi số là 1 lần, đổi bên mỗi lần. Đếm đến 20 là xong 10 lần mỗi bên.',
];
const BRIDGE = [
  'Nằm ngửa, co gối. Hai bàn chân đặt trên sàn, rộng bằng hông, gót chân gần mông. Tay xuôi theo người.',
  'Đẩy gót chân xuống sàn, siết mông, nâng hông lên đến khi người thẳng một đường từ vai đến gối.',
  'Giữ 1 - 2 giây ở trên, rồi hạ xuống chậm.',
  'Bạn phải thấy mỏi ở mông, không phải ở lưng. Không ưỡn lưng quá cao.',
  'Cơ mông là cơ chính đẩy người lên khi leo dốc.',
];

/** Plank and side plank seconds by week (start week, weeks 1-8, race week): they grow, and drop in the lighter weeks. */
const PLANK_SEC = [30, 30, 35, 40, 30, 45, 45, 45, 30, 30];
const SIDE_SEC = [20, 20, 25, 25, 20, 30, 30, 30, 20, 20];
const plankSec = (key: DayKey): number => PLANK_SEC[weekOf(key).n] ?? 30;
const sideSec = (key: DayKey): number => SIDE_SEC[weekOf(key).n] ?? 20;

function core(sets: number, key: DayKey): Step[] {
  return [
    { name: 'Plank thẳng', dose: `${sets} x ${plankSec(key)} giây`, note: PLANK, guide: { ex: 'plank', sets, hold: plankSec(key) } },
    { name: 'Plank nghiêng (Side Plank)', dose: `${sets} x ${sideSec(key)} giây mỗi bên`, note: SIDE_PLANK,
      guide: { ex: 'side', sets, hold: sideSec(key) } },
    { name: 'Dead Bug', dose: `${sets} x 10 mỗi bên`, note: DEAD_BUG, guide: { ex: 'deadbug', sets, reps: 20, pace: 3 } },
    { name: 'Bird Dog', dose: `${sets} x 10 mỗi bên`, note: BIRD_DOG, guide: { ex: 'birddog', sets, reps: 20, pace: 4 } },
    { name: 'Glute Bridge', dose: `${sets} x 15`, note: BRIDGE, guide: { ex: 'bridge', sets, reps: 15, pace: 3 } },
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
    { name: 'Bước lên bậc (Step-up)', dose: `${sets} x 12 mỗi chân`, note: STEP_UP },
    { name: 'Bulgarian Split Squat', dose: `${sets} x 10 mỗi chân`, note: SPLIT_SQUAT },
    { name: 'Squat với dây dài', dose: `${sets} x 15`, note: BAND_SQUAT },
    { name: 'Bước ngang với dây ngắn', dose: `${sets} lần x 10 bước mỗi bên`, note: SIDE_WALK },
    { name: 'Nhón gót một chân trên bậc thang', dose: `${sets} x 12 mỗi chân`, note: CALF },
    { name: 'Core: Plank', dose: `${sets} x ${plankSec(key)} giây`, note: PLANK, guide: { ex: 'plank', sets, hold: plankSec(key) } },
    { name: 'Core: Plank nghiêng', dose: `${c} x ${sideSec(key)} giây mỗi bên`, note: SIDE_PLANK, guide: { ex: 'side', sets: c, hold: sideSec(key) } },
    { name: 'Core: Dead Bug', dose: `${c} x 10 mỗi bên`, note: DEAD_BUG, guide: { ex: 'deadbug', sets: c, reps: 20, pace: 3 } },
  ];
}

const ANCHOR = [
  'Vòng hoặc buộc dây dài vào chỗ chắc, cao hơn đầu: song sắt cửa sổ, hoặc lan can cầu thang ở trên.',
  'Trước mỗi buổi: xem dây có vết nứt hoặc chỗ mỏng không. Kéo thử nhẹ vài lần.',
  'Khi tập, đừng để mặt ở ngay đường dây có thể bật về.',
];
const STRAIGHT_ARM = [
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
const BAND_BRIDGE = ['Đeo dây ngắn ngay trên gối.', ...BRIDGE.slice(0, 3), 'Trong suốt bài, đẩy hai gối ra ngoài, chống lại dây.'];

function homeB(sets: number, withLegs: boolean): Step[] {
  const steps: Step[] = [
    { name: 'Buộc dây dài vào chỗ cao và chắc', note: ANCHOR },
    { name: 'Khởi động', dose: '3 phút', note: ['Xoay vai ra trước 10 lần, ra sau 10 lần.', 'Xoay cánh tay thành vòng tròn 10 lần.', 'Làm 1 hiệp hít đất nhẹ, có thể chống gối.'] },
    { name: 'Kéo dây thẳng tay', dose: `${sets} x 15 - 20`, note: STRAIGHT_ARM },
    { name: 'Đẩy dây tay sau', dose: `${sets} x 15 - 20`, note: PUSHDOWN },
    { name: 'Kéo dây về bụng', dose: `${sets} x 15`, note: ROW },
    { name: 'Chống gậy với dây', dose: `${sets} lần x 2 phút`, note: POLING },
    { name: 'Hít đất', dose: `${sets} x 10 - 15`, note: PUSHUP },
    { name: 'Chống tay sau ghế (Tricep Dips)', dose: `${sets} x 10 - 15`, note: DIPS },
  ];
  if (withLegs) steps.push({ name: 'Nhón gót gối gập', dose: `${sets} x 15 mỗi chân`, note: BENT_CALF });
  steps.push(
    { name: 'Core: Bird Dog', dose: `${sets} x 10 mỗi bên`, note: BIRD_DOG, guide: { ex: 'birddog', sets, reps: 20, pace: 4 } },
    { name: 'Core: Glute Bridge với dây ngắn', dose: `${sets} x 15`, note: BAND_BRIDGE, guide: { ex: 'bandbridge', sets, reps: 15, pace: 3 } },
  );
  return steps;
}
const BAND_NOTE = 'Đứng xa chỗ buộc thì dây căng hơn, nặng hơn. Chọn khoảng cách sao cho làm xong số lần vẫn còn sức thêm 2 - 3 lần.';

const satRun = (min: number): Item => ({
  time: '17:00', tag: 'train', text: `Chạy ${dur(min)} ở chỗ có dốc (cầu, dốc hầm), mức dễ (Z2).`,
  note: 'Lên dốc thì đi bộ nhanh hoặc chạy chậm. Mang theo nước.',
});

const EAT_DRINK: Step[] = [
  { name: 'Ăn', dose: 'mỗi 30 - 45 phút', note: 'Một chút tinh bột dễ ăn, khoảng 60 g tinh bột mỗi giờ. Tập ăn như ngày đua.' },
  { name: 'Uống', dose: '400 - 600 ml mỗi giờ', note: 'Uống theo cơn khát. Thêm 1 viên điện giải mỗi giờ khi trời nóng.' },
];

const longRun = (min: number): Item => ({
  time: '5:45', tag: 'train', text: `Chạy dài ${dur(min)}, mức dễ (Z2), có cầu và dốc.`,
  steps: [{ name: 'Chạy đều mức dễ (Z2)', dose: dur(min), note: 'Lên cầu thì đi bộ nhanh hoặc chạy chậm. Không để nhịp tim lên Z4.' }, ...EAT_DRINK],
});

const mountain = (hours: string, rehearsal: boolean): Item => ({
  time: '6:00', tag: 'train', text: `Chạy Núi Dinh ${hours}.`,
  steps: [
    { name: 'Leo đều, mức dễ đến vừa (Z2 - Z3)', note: ['Không lên Z4. Bước ngắn và đều.', 'Dốc cao: đi bộ nhanh, có thể chống tay lên đùi.', 'Không bung sức sớm.'] },
    { name: 'Chống gậy đúng cách', note: [
      'Nếu gậy có quai: luồn tay từ dưới lên qua quai, rồi cầm cán gậy đè lên quai.',
      'Khi đẩy, đè lực xuống quai. Tay chỉ cầm nhẹ, không nắm chặt. Nắm chặt là lý do chính làm tay mau mỏi.',
      'Cắm gậy gần chân, ngang hoặc hơi trước bàn chân. Không vươn gậy ra xa.',
      'Đẩy bằng cả lưng và thân người, không chỉ bằng tay.',
    ] },
    { name: 'Đổ dốc nhanh nhưng kiểm soát', note: ['Bước ngắn và nhanh. Nhìn trước vài mét.', 'Không chạy hết tốc, để giữ sức cho đùi trước.'] },
    ...EAT_DRINK,
  ],
  note: rehearsal ? 'Buổi tập thử cho ngày đua: dùng đúng giày, gậy, ba lô và đồ ăn sẽ dùng trong giải.' : undefined,
});

// ---------- days ----------

function restDay(key: DayKey, title: string, coreSets: number): Day {
  return {
    kind: 'rest', title, week: weekOf(key).w.label,
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
function weekday2(key: DayKey, title: string, evening: Item, am: number | Item): Day {
  const morning = typeof am !== 'number' ? [wake('6:30'), am, eat('7:45', 'Ăn sáng vừa: tinh bột và đạm.')]
    : am ? [wake('6:30'), preRun, easyRun(am), eat('8:30', 'Ăn sáng vừa: nhiều tinh bột, có đạm.', 'Ăn trong 30 phút sau khi chạy.')]
    : [wake('6:30'), eat('7:30', 'Ăn sáng vừa: tinh bột và đạm.')];
  return {
    kind: 'train', title, week: weekOf(key).w.label,
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

function saturday(key: DayKey, min: number, mountainTomorrow: boolean): Day {
  return {
    kind: 'train', title: `Chạy có dốc ${dur(min)}`, week: weekOf(key).w.label,
    sections: [
      { name: 'Sáng', items: [wake('7:00'), eat('7:30', 'Ăn sáng vừa: tinh bột và đạm.'),
        { time: '9:00', tag: 'care', text: 'Buổi sáng nghỉ. Đi bộ nhẹ nếu muốn.' }] },
      { name: 'Trưa', items: [eat('12:00', 'Ăn trưa vừa: nhiều tinh bột, có đạm và rau.'),
        eat('15:30', 'Ăn nhẹ trước buổi chạy: một chút tinh bột dễ tiêu.')] },
      { name: 'Tối', items: [
        satRun(min),
        eat('19:15', 'Ăn tối nặng: nhiều tinh bột, có đạm.', AFTER + ' Ăn nhiều tinh bột hơn bình thường, vì ngày mai chạy dài.'),
        { time: '21:00', tag: 'care', text: 'Chuẩn bị đồ cho ngày mai.', note: mountainTomorrow
          ? 'Gậy, ba lô, 1,5 - 2 lít nước, đồ ăn khi chạy, viên điện giải, đèn đội đầu, điện thoại và đồng hồ sạc đầy.'
          : 'Nước, đồ ăn khi chạy, viên điện giải, đồng hồ sạc đầy.' },
        sleep('22:00'),
      ] },
    ],
  };
}

function sunday(key: DayKey, s: Sunday): Day {
  const isLong = 'long' in s;
  const morning: Item[] = isLong
    ? [wake('4:45'), eat('5:00', 'Ăn sáng nhẹ: tinh bột dễ tiêu, ít dầu mỡ.'), longRun(s.long), recovery]
    : [{ time: '4:00', tag: 'care', text: 'Thức dậy. Uống 1 ly nước.', note: 'Giờ có thể đổi tùy đường đi. Bắt đầu chạy sớm để tránh nắng.' },
       eat('4:15', 'Ăn sáng vừa: nhiều tinh bột, ít dầu mỡ. Ăn trên xe cũng được.', 'Ăn 1,5 - 2 tiếng trước khi bắt đầu chạy.'),
       mountain(s.mountain, s.rehearsal ?? false), recovery];
  return {
    kind: 'train', title: isLong ? `Chạy dài ${dur(s.long)}` : `Núi Dinh ${s.mountain}`, week: weekOf(key).w.label,
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

/** 2026-10-23: sessions A and B tried in one evening, 1 set of every exercise, to learn the moves. One warm-up at the
 *  start (legs and shoulders), then the band is tied before the arm part; no second warm-up in the middle (Iker, 2026-10-22). */
function trialAB(key: DayKey): Step[] {
  const a = homeA(1, key), b = homeB(1, true);
  const warmUp: Step = { name: 'Khởi động', dose: '5 phút', note: [
    'Lên xuống cầu thang thật nhẹ nhàng 3 phút.', 'Xoay hông, xoay gối, xoay cổ chân, mỗi chỗ 10 vòng.', 'Xoay vai ra trước 10 lần, ra sau 10 lần.',
  ] };
  return [warmUp, ...a.slice(1), b[0]!, ...b.slice(2)];
}

/** Days that do not follow the normal week: the first days and the race week. */
function special(key: DayKey): Day | null {
  switch (key) {
    case '2026-10-21': return weekday2(key, 'Chạy dễ 50 phút', easyRun(50, '17:45'), 0);
    case '2026-10-22': return weekday2(key, 'Thử bài core, leo cầu thang đều 30 phút', steady(30, 0, true),
      coreAtHome(key, 2, 'Thử bài core ở nhà, khoảng 10 phút.', 'Lần đầu tập core: mỗi bài 2 hiệp, làm chậm và đúng.'));
    case '2026-10-23': return weekday2(key, 'Tập thử bài ở nhà A và B', {
      time: '17:45', tag: 'train', text: 'Tập thử Bài ở nhà A và Bài ở nhà B: mỗi bài 1 hiệp, tập nhẹ để học động tác. Khoảng 40 phút.',
      steps: trialAB(key), note: BAND_NOTE }, 0);
    case '2026-12-21': return restDay(key, 'Nghỉ. Core nhẹ.', 2);
    case '2026-12-22': return weekday2(key, 'Chạy dễ 40 phút, có leo dốc nhẹ', {
      time: '17:45', tag: 'train', text: 'Chạy dễ 40 phút, trong đó có 4 lần x 2 phút leo dốc ở mức vừa (Z3).',
      note: 'Leo trên cầu thang hoặc một cây cầu. Đi bộ 2 phút giữa các lần.' }, 0);
    case '2026-12-23': return weekday2(key, 'Core nhẹ, chạy dễ 30 phút', easyRun(30, '17:45'),
      coreAtHome(key, 2, 'Core nhẹ ở nhà, khoảng 10 phút.'));
    case '2026-12-24': return weekday2(key, 'Chạy dễ 30 phút và 4 lần chạy nhanh', {
      time: '17:45', tag: 'train', text: 'Chạy dễ 30 phút. Cuối buổi chạy nhanh 4 lần, mỗi lần 20 giây.',
      note: 'Đi bộ 1 phút giữa các lần chạy nhanh. Không mệt là đúng.' }, 0);
    case '2026-12-25': return {
      kind: 'rest', title: 'Nghỉ. Chuẩn bị đồ, ăn nhiều tinh bột.', week: 'Tuần đua',
      sections: [
        { name: 'Sáng', items: [wake('6:30'), eat('7:30', 'Ăn sáng vừa: nhiều tinh bột.')] },
        { name: 'Trưa', items: [eat('12:00', 'Ăn trưa nặng: nhiều tinh bột, ít rau.', 'Từ hôm nay đến ngày đua, ăn nhiều tinh bột hơn bình thường.'),
          eat('16:00', 'Ăn nhẹ: tinh bột.')] },
        { name: 'Tối', items: [
          { time: '18:00', tag: 'care', text: 'Chuẩn bị đồ đua.', note: 'Giày, gậy, ba lô, áo mưa, đèn đội đầu và pin, đồ ăn khi chạy, viên điện giải, đồ bắt buộc của giải.' },
          eat('19:00', 'Ăn tối nặng: nhiều tinh bột, ít dầu mỡ.', 'Ăn món quen.'),
          sleep('22:00'),
        ] },
      ],
    };
    case '2026-12-26': return {
      kind: 'train', title: 'Chạy rất nhẹ 20 phút. Ăn nhiều tinh bột.', week: 'Tuần đua',
      sections: [
        { name: 'Sáng', items: [wake('6:30'), easyRun(20, '7:00'),
          eat('7:45', 'Ăn sáng vừa: nhiều tinh bột.')] },
        { name: 'Trưa', items: [{ time: '12:00', tag: 'eat', text: 'Ăn trưa nặng: nhiều tinh bột, ít rau, ít dầu mỡ.',
          note: 'Ngày trước giải: ăn món quen, ít chất xơ và dầu mỡ để bụng nhẹ. Không thử món mới.' },
        eat('15:30', 'Ăn nhẹ: tinh bột.')] },
        { name: 'Tối', items: [
          { time: '17:00', tag: 'care', text: 'Kiểm tra lại đồ đua, số đeo (bib), sạc đồng hồ và đèn.' },
          eat('18:30', 'Ăn tối sớm, vừa: nhiều tinh bột, ít rau, ít dầu mỡ.'),
          { time: '21:00', tag: 'care', text: 'Đi ngủ sớm.' },
        ] },
      ],
    };
    case RACE: return {
      kind: 'race', title: 'Ngày đua: 65km Núi Dinh (4000m leo)', week: 'Tuần đua',
      sections: [
        { name: 'Trước giờ xuất phát', items: [
          { time: '3 tiếng trước', tag: 'care', text: 'Thức dậy. Uống 1 ly nước.' },
          { time: '2,5 tiếng trước', tag: 'eat', text: 'Ăn sáng vừa: nhiều tinh bột, ít dầu mỡ, món quen.',
            note: 'Ít dầu mỡ. Không thử món mới.' },
          { time: '1 tiếng trước', tag: 'eat', text: 'Uống thêm 300 - 500 ml nước có điện giải. Kiểm tra đồ lần cuối.' },
        ] },
        { name: 'Trong giải', items: [
          { time: 'Nửa đầu', tag: 'train', text: 'Giữ sức đến khoảng km 30 - 35.',
            note: 'Leo ở mức Z2 - Z3, không lên Z4. Đổ dốc nhanh nhưng không hết tốc, để giữ đùi trước.' },
          { time: 'Gậy', tag: 'train', text: 'Dùng gậy từ con dốc đầu tiên. Luồn tay qua quai, cầm nhẹ.' },
          { time: 'Mỗi giờ', tag: 'eat', text: 'Ăn khoảng 60 g tinh bột dễ ăn. Ăn ngay từ giờ đầu.' },
          { time: 'Mỗi giờ', tag: 'eat', text: 'Uống theo cơn khát, khoảng 400 - 600 ml. 1 viên điện giải khi trời nóng.' },
          { time: 'Nửa sau', tag: 'train', text: 'Còn khỏe thì tăng dần. Đây là lúc đổ dốc nhanh như sóc.' },
          { time: 'Chuột rút', tag: 'care', text: 'Đi chậm lại, bước ngắn hơn, ăn và uống. Giãn nhẹ cơ đó 20 - 30 giây, rồi đi tiếp thật chậm. Đừng dừng lại quá lâu.' },
        ] },
        { name: 'Sau khi về đích', items: [
          { time: 'Ngay sau', tag: 'eat', text: 'Uống nước. Ăn nhẹ: tinh bột và đạm.' },
          { time: '1 - 2 tiếng sau', tag: 'eat', text: 'Ăn nặng: nhiều tinh bột và nhiều đạm.' },
          { time: 'Tuần sau', tag: 'care', text: 'Nghỉ chạy. Chỉ đi bộ nhẹ, ngủ nhiều.' },
        ] },
      ],
    };
    default: return null;
  }
}

/** The plan of one day. Days outside the plan get a short "not in the plan" day. */
export function planOf(key: DayKey): Day {
  const sp = special(key);
  if (sp) return sp;
  const { w } = weekOf(key);
  const wd = weekday(key);
  const am = w.am.includes(wd) ? w.amMin : 0;
  switch (wd) {
    case 0: return restDay(key, 'Nghỉ chạy: core và giãn cơ', 3);
    case 1: return weekday2(key, `Leo dốc biến tốc: ${w.reps} lần x ${w.work} phút`, intervals(w.reps, w.work), am);
    case 2: return weekday2(key, w.lastLegs ? 'Bài ở nhà A: chân và core (nhẹ)' : 'Bài ở nhà A: chân và core', {
      time: '17:45', tag: 'train', text: 'Bài ở nhà A: chân và core (khoảng 45 phút).', steps: homeA(w.sets, key),
      note: w.lastLegs ? 'Buổi tập chân cuối cùng trước giải. Tập nhẹ.' : w.homeNote }, am);
    case 3: return weekday2(key, `Leo cầu thang đều ${w.steady} phút`, steady(w.steady, w.pack), am);
    case 4: return weekday2(key, w.lastLegs ? 'Bài ở nhà B: tay và core (nhẹ)' : 'Bài ở nhà B: tay chống gậy', {
      time: '17:45', tag: 'train',
      text: w.lastLegs ? 'Bài ở nhà B: chỉ tay và core, tập nhẹ.' : 'Bài ở nhà B: tay chống gậy, bắp chân và core (khoảng 45 phút).',
      steps: homeB(w.sets, !w.lastLegs), note: [w.homeNote, BAND_NOTE].filter(Boolean).join(' ') }, am);
    case 5: return saturday(key, w.sat, 'mountain' in w.sun);
    default: return sunday(key, w.sun);
  }
}

// ---------- the plan over the calendar ----------

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

export function inPlan(key: DayKey): boolean { return key >= START && key <= RACE; }

/** A day can be marked done when it is in the plan, is not a rest day, and is not in the future. */
export function canMark(key: DayKey, todayKey: DayKey): boolean {
  return inPlan(key) && key <= todayKey && planOf(key).kind !== 'rest';
}

/**
 * out: not in the plan. rest: rest day. done: marked done.
 * missed: in the past and not done. open: today and not done yet. future: later.
 */
export type State = 'out' | 'rest' | 'done' | 'missed' | 'open' | 'future';

export function stateOf(key: DayKey, todayKey: DayKey, done: ReadonlySet<DayKey>): State {
  if (!inPlan(key)) return 'out';
  if (planOf(key).kind === 'rest') return 'rest';
  if (key > todayKey) return 'future';
  if (done.has(key)) return 'done';
  return key < todayKey ? 'missed' : 'open';
}

/** All weeks of the plan, Monday to Sunday, from the week of START to the week of RACE. */
export function weeks(): DayKey[][] {
  const out: DayKey[][] = [];
  for (let mon = weekStart(START); mon <= RACE; mon = addDays(mon, 7)) {
    out.push([0, 1, 2, 3, 4, 5, 6].map(i => addDays(mon, i)));
  }
  return out;
}

export interface Summary { done: number; missed: number; daysToRace: number }

export function summary(todayKey: DayKey, done: ReadonlySet<DayKey>): Summary {
  let nDone = 0, nMissed = 0;
  for (const w of weeks()) {
    for (const k of w) {
      const s = stateOf(k, todayKey, done);
      if (s === 'done') nDone++;
      else if (s === 'missed') nMissed++;
    }
  }
  return { done: nDone, missed: nMissed, daysToRace: daysBetween(todayKey, RACE) };
}
