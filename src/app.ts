// Trani page. Two tabs: Today (the whole day: what to eat and do, and the done button) and Plan (all the weeks).
// A finished session is one small document in Firestore (Google), in the list "trani".
// The document name is the day, like "2026-10-21", and it holds {day: "2026-10-21"}. No document means not done.
// Firestore keeps a copy on the phone, so a press made offline is sent later.
// The config block is the same public one as Haba (same Google project); the Firestore rules protect the data.

import { initializeApp } from 'firebase/app';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, deleteDoc, onSnapshot,
  type Firestore, type QuerySnapshot, type DocumentData,
} from 'firebase/firestore';
import type { Guide } from './guide.ts';
import * as P from './plan.ts';
import { markHaba, unmarkHaba } from './haba-mark.ts';
import { buttonLabel, initPlayer, play } from './player.ts';

const firebaseConfig = {
  apiKey: 'AIzaSyDtkJvnZLPIkIAJzj9w3F486bX2E8T5kuU',
  authDomain: 'habits-433f8.firebaseapp.com',
  projectId: 'habits-433f8',
  storageBucket: 'habits-433f8.firebasestorage.app',
  messagingSenderId: '632547558396',
  appId: '1:632547558396:web:5bdf411d492236c5686879',
};
const COLLECTION = 'trani';

const app = initializeApp(firebaseConfig);
let db: Firestore;
try {
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch {
  db = initializeFirestore(app, {}); // very old browser without local storage: still works, only online
}

const state = {
  done: new Set<P.DayKey>(),
  pending: new Set<P.DayKey>(),
  loaded: false,
};

// ---------- actions ----------
function toggle(key: P.DayKey): void {
  if (!P.canMark(key, P.today())) return;
  const ref = doc(db, COLLECTION, key);
  const undo = state.done.has(key);
  const p = undo ? deleteDoc(ref) : setDoc(ref, { day: key });
  p.catch((e: Error) => setStatus('Không lưu được: ' + e.message, true));
  // A done day also marks Jogging and/or Core in Haba for that day; taking "done" away removes them (Iker, 2026-10-21).
  for (const item of P.habaItems(P.planOf(key))) {
    (undo ? unmarkHaba(item, key) : markHaba(item, key === P.today() ? undefined : key))
      .catch(() => setStatus('Đã lưu, nhưng không ghi được vào Haba.', true));
  }
}

// ---------- rendering ----------
function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error('missing element #' + id);
  return el;
}
function setStatus(msg: string, err = false): void {
  const el = $('status');
  el.textContent = msg;
  el.className = 'status' + (err ? ' err' : '');
}
function esc(s: unknown): string {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));
}
function dateOf(key: P.DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, 12);
}
function longDay(key: P.DayKey): string {
  return dateOf(key).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
}
function shortDay(key: P.DayKey): string {
  const d = dateOf(key);
  return d.getDate() + '/' + (d.getMonth() + 1);
}

/** The day shown on the first tab: today, or the day picked on the plan tab (#day-2026-11-03). */
function selectedDay(): P.DayKey {
  const m = /^#day-(\d{4}-\d{2}-\d{2})$/.exec(location.hash);
  return m?.[1] ?? P.today();
}

function render(): void {
  const todayKey = P.today();
  const key = selectedDay();
  renderDay(key, todayKey);
  renderPlan(todayKey, key);
}

function renderDay(key: P.DayKey, todayKey: P.DayKey): void {
  const day = P.planOf(key);
  $('back').hidden = key === todayKey;
  $('date-line').textContent = (key === todayKey ? 'Hôm nay, ' : '') + longDay(key);

  const left = P.daysBetween(todayKey, P.RACE);
  $('countdown').textContent = left > 0 ? `Còn ${left} ngày đến ngày đua (Chủ Nhật 27/12).`
    : left === 0 ? 'Hôm nay là ngày đua. Chúc may mắn!' : 'Giải đã xong.';

  const st = P.stateOf(key, todayKey, state.done);
  const race = day.kind === 'race';
  let mark = '';
  if (st === 'out') mark = '<p class="muted">Ngày này không có trong giáo án.</p>';
  else if (st === 'rest') mark = '<p class="note-box">Ngày nghỉ chạy. Không cần đánh dấu.</p>';
  else if (st === 'future') mark = '<p class="note-box">Chưa tới ngày này.</p>';
  else if (!state.loaded) mark = '<p class="muted">Đang tải…</p>';
  else if (st === 'done') {
    const wait = state.pending.has(key) ? ' <span class="p">(đang lưu…)</span>' : '';
    mark = `<div class="done-box">✓ ${race ? 'Đã hoàn thành giải' : 'Đã tập xong'}${wait}</div>` +
      '<button class="undo" id="mark-btn" type="button">Bỏ đánh dấu</button>';
  } else {
    mark = `<button class="mark" id="mark-btn" type="button">${race ? 'Đánh dấu đã hoàn thành giải' : 'Đánh dấu đã tập xong'}</button>`;
  }
  $('mark').innerHTML = mark;

  guides.clear();
  if (!P.inPlan(key)) { $('session').innerHTML = ''; return; }
  let html = `<p class="week">${esc(day.week)}</p><h2>${esc(day.title)}</h2>`;
  day.sections.forEach((sec, si) => {
    html += `<h3>${esc(sec.name)}</h3><ol class="items">`;
    sec.items.forEach((it, ii) => { html += item(it, `${key}/${si}/${ii}`); });
    html += '</ol>';
  });
  $('session').innerHTML = html;
}

const TAG_LABEL: Record<P.Tag, string> = { eat: 'Ăn', train: 'Tập', care: 'Sinh hoạt' };

/** Exercises whose how-to is open. Kept here so a new drawing of the page does not close them. */
const opened = new Set<string>();
/** Core exercises with a voice guide on the page, by id. Filled while drawing. */
const guides = new Map<string, { guide: Guide; name: string }>();

/** One line of the day: the time, what to eat or do, and the exercises when there are some. Tap an exercise to see how. */
function item(it: P.Item, id: string): string {
  let html = `<li class="it t-${it.tag}"><span class="when">${esc(it.time)}</span><div class="what">` +
    `<p class="txt"><span class="tag">${TAG_LABEL[it.tag]}</span> ${esc(it.text)}</p>`;
  if (it.note) html += `<p class="note">${esc(it.note)}</p>`;
  if (it.steps?.length) {
    if (it.steps.some(x => x.note)) {
      html += '<p class="hint">Bấm vào tên bài để xem cách làm.' + (it.steps.some(x => x.guide) ? ' Bấm ▶ để tập 1 hiệp cùng giọng đọc.' : '') + '</p>';
    }
    html += '<ul class="steps">';
    it.steps.forEach((x, j) => {
      const head = `<span class="name">${esc(x.name)}</span>` + (x.dose ? `<span class="dose">${esc(x.dose)}</span>` : '');
      const lines = x.note === undefined ? [] : typeof x.note === 'string' ? [x.note] : x.note;
      const sid = `${id}/${j}`;
      let btn = '';
      if (x.guide) {
        const name = x.name.replace(/^Core: /, '');
        guides.set(sid, { guide: x.guide, name });
        btn = `<button class="play" type="button" data-play="${esc(sid)}" aria-label="Tập cùng giọng đọc: ${esc(name)}">` +
          `${buttonLabel(sid, x.guide.sets)}</button>`;
      }
      const body = lines.length
        ? `<details data-id="${esc(sid)}"${opened.has(sid) ? ' open' : ''}><summary class="row">${head}</summary>` +
          `<ul class="how">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>`
        : `<div class="row plain">${head}</div>`;
      html += `<li${btn ? ' class="g"' : ''}>${body}${btn}</li>`;
    });
    html += '</ul>';
  }
  return html + '</div></li>';
}

const STATE_LABEL: Record<P.State, string> = {
  out: '', rest: 'nghỉ', done: 'đã tập', missed: 'chưa tập', open: 'hôm nay, chưa tập', future: 'sắp tới',
};

function renderPlan(todayKey: P.DayKey, selected: P.DayKey): void {
  const sum = P.summary(todayKey, state.done);
  $('stats').innerHTML = state.loaded
    ? `<div><b>${sum.done}</b><span>buổi đã tập</span></div><div><b>${sum.missed}</b><span>buổi chưa tập</span></div>` +
      `<div><b>${Math.max(0, sum.daysToRace)}</b><span>ngày đến giải</span></div>`
    : '<p class="muted">Đang tải…</p>';

  let html = '<div class="wk head"><span></span>' +
    ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => `<span class="dh">${d}</span>`).join('') + '</div>';
  P.weeks().forEach((w, i) => {
    html += `<div class="wk"><span class="wl">${esc(P.WEEK_LABELS[i] ?? '')}</span>`;
    for (const k of w) {
      const st = P.stateOf(k, todayKey, state.done);
      const race = k === P.RACE;
      const cls = `cell s-${st}${k === todayKey ? ' today' : ''}${k === selected && location.hash.startsWith('#day-') ? ' sel' : ''}`;
      const text = `${shortDay(k)}${race ? '<i class="flag">🏁</i>' : ''}`;
      if (st === 'out') html += `<span class="${cls}">${text}</span>`;
      else html += `<a class="${cls}" href="#day-${k}" aria-label="${esc(longDay(k))}: ${race ? 'ngày đua, ' : ''}${STATE_LABEL[st]}">${text}</a>`;
    }
    html += '</div>';
  });
  $('grid').innerHTML = html;
}

// ---------- tabs ----------
// The panels are named panel-today and so on, not today, so the browser does not jump to them
// and hide the top of the page under the sticky header.
function showTab(): void {
  const h = location.hash;
  const name = h === '#plan' ? 'plan' : 'today';
  for (const t of ['today', 'plan']) {
    $('panel-' + t).classList.toggle('active', t === name);
    $('tab-' + t).classList.toggle('active', t === name);
    $('tab-' + t).setAttribute('aria-selected', t === name ? 'true' : 'false');
  }
  render();
  window.scrollTo(0, 0);
}

// ---------- live data ----------
function onData(snap: QuerySnapshot<DocumentData>): void {
  state.done = new Set(snap.docs.map(d => d.id).filter(P.isDayKey));
  state.pending = new Set(snap.docs.filter(d => d.metadata.hasPendingWrites).map(d => d.id));
  state.loaded = true;
  if (snap.metadata.hasPendingWrites && !navigator.onLine) setStatus('Mất mạng. Đã lưu trên điện thoại, sẽ gửi sau.', true);
  else if (snap.metadata.hasPendingWrites) setStatus('Đang lưu…');
  else if (snap.metadata.fromCache && !navigator.onLine) setStatus('Mất mạng. Đang xem bản lưu trên điện thoại.', true);
  else setStatus('');
  render();
}

function listen(): void {
  onSnapshot(collection(db, COLLECTION), { includeMetadataChanges: true }, onData,
    err => setStatus('Không đọc được dữ liệu: ' + err.message, true));
}

// ---------- wiring ----------
function init(): void {
  showTab();
  window.addEventListener('hashchange', showTab);
  // "toggle" does not bubble, so listen while it goes down to the details element.
  $('session').addEventListener('toggle', e => {
    const d = e.target as HTMLDetailsElement;
    const id = d.dataset['id'];
    if (id) { if (d.open) opened.add(id); else opened.delete(id); }
  }, true);
  $('session').addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLElement>('[data-play]');
    const g = guides.get(b?.dataset['play'] ?? '');
    if (b && g) play(b.dataset['play'] ?? '', g.guide, g.name);
  });
  initPlayer(render);
  $('mark').addEventListener('click', e => {
    if ((e.target as Element).closest('#mark-btn')) toggle(selectedDay());
  });
  // The page may stay open on the phone for days: draw again when it comes back, so "today" is right.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  window.addEventListener('online', () => setStatus(''));
  window.addEventListener('offline', () => setStatus('Mất mạng. Bấm vẫn được, sẽ gửi sau.', true));
  listen();
}

init();
