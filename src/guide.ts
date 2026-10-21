// Guided core sets: what the voice says and what the screen shows, second by second, for one set.
// No browser things in here, so it can be tested with node (see test/plan.test.ts).
//
// Iker presses play at the start of every set (2026-10-21). There is no rest timer between sets.
// A set: the voice names the exercise, gives 5 seconds to get into position, counts "3, 2, 1, bắt đầu",
// then either counts the seconds down (plank) or counts every repetition at a steady pace.

/** The core exercises that have a voice guide. */
export type Ex = 'plank' | 'side' | 'deadbug' | 'birddog' | 'bridge' | 'bandbridge';

/** hold: seconds to hold (side: per side). reps and pace: count reps, one every `pace` seconds. */
export interface Guide { ex: Ex; sets: number; hold?: number; reps?: number; pace?: number }

/** At `at` seconds after play: say `clip` (an id in VOICE_LINES), and show `big` and `small` on the screen. */
export interface Cue { at: number; clip?: string; big?: string; small?: string }

const NUMBERS = ['một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười',
  'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín', 'hai mươi'];

const NAMES: Record<Ex, string> = {
  plank: 'Plank thẳng', side: 'Plank nghiêng', deadbug: 'Dead Bug', birddog: 'Bird Dog',
  bridge: 'Glute Bridge', bandbridge: 'Glute Bridge với dây',
};
const ALTERNATE: readonly Ex[] = ['deadbug', 'birddog'];
export const MAX_COUNT = 20;

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

/**
 * Every line the voice can say, by id: 30 lines (Iker, 2026-10-21: no near copies). The voice does not say the set
 * number; the screen shows it. Each line is ONE sentence: tools/make-voice.mjs asks for all lines at once and cuts
 * the sound where each sentence ends.
 */
export const VOICE_LINES: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const ex of Object.keys(NAMES) as Ex[]) {
    const extra = ex === 'side' ? ', bên trái trước' : ALTERNATE.includes(ex) ? ', đổi bên mỗi lần' : '';
    out[ex] = `${NAMES[ex]}${extra}, vào tư thế.`;
  }
  NUMBERS.forEach((n, i) => { out[`n${i + 1}`] = cap(n) + '.'; });
  out['go'] = 'Bắt đầu!';
  out['ten'] = 'Còn mười giây.';
  out['switch'] = 'Đổi bên, bên phải.';
  out['done'] = 'Xong hiệp, nghỉ đi.';
  return out;
})();

/** Seconds from play to "bắt đầu": the voice names the set, then counts 3, 2, 1. */
export const LEAD = 8;

function countIn(at: number, small: string): Cue[] {
  return [
    { at: at - 3, clip: 'n3', big: '3', small }, { at: at - 2, clip: 'n2', big: '2', small },
    { at: at - 1, clip: 'n1', big: '1', small }, { at, clip: 'go', big: '', small },
  ];
}

function holdCues(start: number, sec: number, small: string): Cue[] {
  const out: Cue[] = [];
  for (let s = 0; s < sec; s++) {
    const left = sec - s;
    const clip = left === 10 && sec >= 20 ? 'ten' : left <= 3 ? `n${left}` : undefined;
    out.push({ at: start + s, clip, big: String(left), small });
  }
  return out;
}

/** The cues of one set (1-based). The last cue is the end of the set. */
export function cues(g: Guide, set: number): Cue[] {
  const name = NAMES[g.ex];
  const last = set >= g.sets;
  const out: Cue[] = [{ at: 0, clip: g.ex, big: '', small: 'Vào tư thế' }];
  let end: number;
  if (g.hold) {
    const first = g.ex === 'side' ? 'Bên trái' : name;
    out.push(...countIn(LEAD, first), ...holdCues(LEAD, g.hold, first));
    end = LEAD + g.hold;
    if (g.ex === 'side') {
      out.push({ at: end, clip: 'switch', big: '', small: 'Đổi bên' }, ...countIn(end + 5, 'Bên phải'), ...holdCues(end + 5, g.hold, 'Bên phải'));
      end = end + 5 + g.hold;
    }
  } else {
    const reps = Math.min(g.reps ?? 10, MAX_COUNT), pace = g.pace ?? 3;
    const small = ALTERNATE.includes(g.ex) ? 'Đổi bên mỗi lần' : name;
    out.push(...countIn(LEAD, small));
    for (let i = 1; i <= reps; i++) out.push({ at: LEAD + 1 + (i - 1) * pace, clip: `n${i}`, big: String(i), small: `${small} · ${i}/${reps}` });
    end = LEAD + 1 + reps * pace;
  }
  out.push({ at: end, clip: 'done', big: '✓', small: last ? 'Xong bài này' : `Xong hiệp ${set}/${g.sets}` });
  return out;
}
