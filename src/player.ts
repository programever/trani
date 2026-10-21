// The voice guide for core sets: a bar at the bottom of the screen with a big timer, and Rebo's voice (Hoài My).
// One tap on ▶ plays one set. There is no rest timer: Iker taps ▶ again when ready (2026-10-21).
// All voice lines are in one file, voice.mp3; VOICE says where each line starts and how long it is.
// iPhone rules: sound may only start from a tap, so the first tap plays the silent start of the file;
// after that the page may play the file from a timer. The screen is kept on while a set runs.

import { cues, type Cue, type Guide } from './guide.ts';
import { VOICE } from './voice.ts';

const VOICE_URL = 'voice.mp3';

interface Run { id: string; guide: Guide; name: string; set: number; list: Cue[]; idx: number; t0: number; pausedAt: number; timer: number }

let run: Run | null = null;
let last: { id: string; guide: Guide; name: string } | null = null;
let audio: HTMLAudioElement | null = null;
let stopTimer = 0;
let wake: WakeLockSentinel | null = null;
/** The next set of each exercise on the page, by exercise id. Kept only while the page is open. */
const nextSets = new Map<string, number>();
let changed: () => void = () => {};

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error('missing element #' + id);
  return el;
}

/** Text of the ▶ button of an exercise: the next set, or ✓ when all sets are done. */
export function buttonLabel(id: string, sets: number): string {
  const n = nextSets.get(id) ?? 1;
  return n > sets ? '✓' : `▶ ${n}/${sets}`;
}

function say(clip: string): void {
  const v = VOICE[clip];
  const a = audio;
  if (!v || !a) return;
  window.clearTimeout(stopTimer);
  const go = (): void => {
    a.currentTime = v[0];
    void a.play().catch(() => {});
    stopTimer = window.setTimeout(() => a.pause(), v[1] * 1000);
  };
  if (a.readyState >= 1) go(); else a.addEventListener('loadedmetadata', go, { once: true });
}

/** Must run inside the tap: plays the silent start of the file, so the phone allows sound later. */
function unlock(): void {
  if (audio) return;
  audio = new Audio(VOICE_URL);
  audio.preload = 'auto';
  void audio.play().catch(() => {});
}

async function keepAwake(on: boolean): Promise<void> {
  try {
    if (on && !wake && 'wakeLock' in navigator) {
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener('release', () => { wake = null; });
    } else if (!on && wake) {
      await wake.release();
      wake = null;
    }
  } catch { /* not allowed here: the screen may turn off by itself */ }
}

function showCue(c: Cue): void {
  if (c.big !== undefined) $('p-big').textContent = c.big;
  if (c.small !== undefined) $('p-small').textContent = c.small;
}

function buttons(state: 'running' | 'paused' | 'done'): void {
  const pause = $('p-pause') as HTMLButtonElement;
  const next = $('p-next') as HTMLButtonElement;
  pause.hidden = state === 'done';
  pause.textContent = state === 'paused' ? 'Tiếp tục' : 'Tạm dừng';
  next.hidden = true;
  if (state === 'done' && last) {
    const n = nextSets.get(last.id) ?? 1;
    if (n <= last.guide.sets) { next.hidden = false; next.textContent = `▶ Hiệp ${n}/${last.guide.sets}`; }
  }
  $('p-close').textContent = state === 'done' ? 'Đóng' : 'Dừng';
}

/** Play the next set of one exercise. Call it from the tap on ▶. */
export function play(id: string, guide: Guide, name: string): void {
  unlock();
  stop(false);
  let set = nextSets.get(id) ?? 1;
  if (set > guide.sets) set = 1; // all done: start again
  nextSets.set(id, set);
  last = { id, guide, name };
  run = { id, guide, name, set, list: cues(guide, set), idx: 0, t0: performance.now() + 700, pausedAt: 0, timer: 0 };
  $('p-name').textContent = name;
  $('p-set').textContent = `Hiệp ${set}/${guide.sets}`;
  showCue({ at: 0, big: '', small: 'Chuẩn bị' });
  buttons('running');
  $('player').hidden = false;
  document.body.classList.add('playing');
  void keepAwake(true);
  tick();
}

function tick(): void {
  const r = run;
  if (!r || r.pausedAt) return;
  const c = r.list[r.idx];
  if (!c) return;
  const due = r.t0 + c.at * 1000;
  r.timer = window.setTimeout(() => fire(r, c, due), Math.max(0, due - performance.now()));
}

function fire(r: Run, c: Cue, due: number): void {
  if (run !== r) return;
  // If the phone slept, timers come late: show where we are, but do not say old lines.
  if (c.clip && performance.now() - due < 1500) say(c.clip);
  showCue(c);
  r.idx++;
  if (r.idx < r.list.length) { tick(); return; }
  nextSets.set(r.id, r.set + 1);
  run = null;
  buttons('done');
  void keepAwake(false);
  changed();
}

function pauseOrResume(): void {
  const r = run;
  if (!r) return;
  if (r.pausedAt) {
    r.t0 += performance.now() - r.pausedAt;
    r.pausedAt = 0;
    buttons('running');
    tick();
  } else {
    r.pausedAt = performance.now();
    window.clearTimeout(r.timer);
    audio?.pause();
    buttons('paused');
  }
}

function stop(hide = true): void {
  if (run) { window.clearTimeout(run.timer); run = null; }
  window.clearTimeout(stopTimer);
  audio?.pause();
  if (hide) {
    $('player').hidden = true;
    document.body.classList.remove('playing');
    void keepAwake(false);
  }
}

/** Wire the bar's buttons. `onChange` redraws the page, so the ▶ buttons show the next set. */
export function initPlayer(onChange: () => void): void {
  changed = onChange;
  $('p-pause').addEventListener('click', pauseOrResume);
  $('p-next').addEventListener('click', () => { if (last) play(last.id, last.guide, last.name); });
  $('p-close').addEventListener('click', () => { stop(); changed(); });
  // The phone drops the screen lock when the page is hidden; take it again when the page comes back.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && run) void keepAwake(true); });
}
