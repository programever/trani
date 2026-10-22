// Trani page. Tabs: Hôm nay (the whole day, the done button and how it felt), Lịch (every day of the plan on a
// calendar: the history and the next 7 planned days), Bài tập (a video per exercise) and, only in the race week,
// Ngày đua (the race page) (Iker, 2026-10-22). The days come from days/*.json, put into the page at build time.
// A finished session is one small document in Firestore (Google), in the list "trani". The document name is the
// day, like "2026-10-21", and it holds {day: "2026-10-21"}; after a feel button also {feel: "cramp"}.
// No document means not done. Firestore keeps a copy on the phone, so a press made offline is sent later.
// The config block is the same public one as Haba (same Google project); the Firestore rules protect the data.

import { initializeApp } from 'firebase/app';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, deleteDoc, onSnapshot,
  type Firestore, type QuerySnapshot, type DocumentData,
} from 'firebase/firestore';
import type { Guide } from './guide.ts';
import * as P from './plan.ts';
import { RECIPES } from './days.generated.ts';
import { markHaba, unmarkHaba } from './haba-mark.ts';
import { buttonLabel, initPlayer, play } from './player.ts';
import { GROUPS, VIDEOS, type VideoKey } from './videos.ts';

const firebaseConfig = {
  apiKey: 'AIzaSyDtkJvnZLPIkIAJzj9w3F486bX2E8T5kuU',
  authDomain: 'habits-433f8.firebaseapp.com',
  projectId: 'habits-433f8',
  storageBucket: 'habits-433f8.firebasestorage.app',
  messagingSenderId: '632547558396',
  appId: '1:632547558396:web:5bdf411d492236c5686879',
};
const COLLECTION = 'trani';
const plan = P.makePlan(RECIPES);

const app = initializeApp(firebaseConfig);
let db: Firestore;
try {
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch {
  db = initializeFirestore(app, {}); // very old browser without local storage: still works, only online
}

const state = {
  done: new Set<P.DayKey>(),
  feel: new Map<P.DayKey, P.Feel>(),
  pending: new Set<P.DayKey>(),
  loaded: false,
};

// ---------- actions ----------
function toggle(key: P.DayKey): void {
  const day = plan.dayOf(key);
  if (!day || !plan.canMark(key, P.today())) return;
  const ref = doc(db, COLLECTION, key);
  const undo = state.done.has(key);
  const p = undo ? deleteDoc(ref) : setDoc(ref, { day: key });
  p.catch((e: Error) => setStatus('Không lưu được: ' + e.message, true));
  // A done day also marks Jogging and/or Core in Haba for that day; taking "done" away removes them (Iker, 2026-10-21).
  for (const item of P.habaItems(day)) {
    (undo ? unmarkHaba(item, key) : markHaba(item, key === P.today() ? undefined : key))
      .catch(() => setStatus('Đã lưu, nhưng không ghi được vào Haba.', true));
  }
}

/** How the day felt (Iker, 2026-10-22): written into the same document as "done". The same button again clears it. */
function setFeel(key: P.DayKey, feel: P.Feel): void {
  if (!state.done.has(key)) return;
  const next = state.feel.get(key) === feel ? null : feel;
  setDoc(doc(db, COLLECTION, key), next ? { day: key, feel: next } : { day: key })
    .catch((e: Error) => setStatus('Không lưu được: ' + e.message, true));
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
const WD = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

/** The day shown on the first tab: today, or the day picked on the calendar (#day-2026-11-03). */
function selectedDay(): P.DayKey {
  const m = /^#day-(\d{4}-\d{2}-\d{2})$/.exec(location.hash);
  return m?.[1] ?? P.today();
}

function render(): void {
  const todayKey = P.today();
  const key = selectedDay();
  renderDay(key, todayKey);
  renderCal(todayKey, key);
  renderRace();
}

function renderDay(key: P.DayKey, todayKey: P.DayKey): void {
  const day = plan.dayOf(key);
  $('back').hidden = key === todayKey;
  $('date-line').textContent = (key === todayKey ? 'Hôm nay, ' : '') + longDay(key);

  const left = P.daysBetween(todayKey, P.RACE);
  $('countdown').textContent = left > 0 ? `Còn ${left} ngày đến ngày đua (Chủ Nhật 27/12).`
    : left === 0 ? 'Hôm nay là ngày đua. Chúc may mắn!' : 'Giải đã xong.';

  const st = plan.stateOf(key, todayKey, state.done);
  const race = day?.kind === 'race';
  let mark = '';
  if (st === 'out') {
    mark = `<p class="note-box">${key > todayKey ? 'Ngày này chưa có kế hoạch. Mỗi sáng kế hoạch được thêm một ngày.' : 'Ngày này không có trong kế hoạch.'}</p>`;
  } else if (st === 'rest') mark = '<p class="note-box">Ngày nghỉ chạy. Không cần đánh dấu.</p>';
  else if (st === 'future') mark = '<p class="note-box">Chưa tới ngày này.</p>';
  else if (!state.loaded) mark = '<p class="muted">Đang tải…</p>';
  else if (st === 'done') {
    const wait = state.pending.has(key) ? ' <span class="p">(đang lưu…)</span>' : '';
    const feel = state.feel.get(key);
    mark = `<div class="done-box">✓ ${race ? 'Đã hoàn thành giải' : 'Đã tập xong'}${wait}</div>` +
      '<div class="feel" id="feel"><p class="feel-q">Buổi tập thấy sao? Bấm một nút. Chuột rút thì ngày mai sẽ nhẹ hơn.</p>' +
      P.FEELS.map(f => `<button type="button" class="feel-btn${feel === f ? ' on' : ''}" data-feel="${f}">${P.FEEL_LABEL[f]}</button>`).join('') +
      '</div><button class="undo" id="mark-btn" type="button">Bỏ đánh dấu</button>';
  } else {
    mark = `<button class="mark" id="mark-btn" type="button">${race ? 'Đánh dấu đã hoàn thành giải' : 'Đánh dấu đã tập xong'}</button>`;
  }
  $('mark').innerHTML = mark;

  guides.clear();
  $('session').innerHTML = day ? dayHtml(day, key) : '';
}

/** The label, the title, the reason of the day (when there is one) and the three parts with their lines. */
function dayHtml(day: P.Day, key: P.DayKey): string {
  let html = `<p class="week">${esc(day.week)}</p><h2>${esc(day.title)}</h2>`;
  if (day.why) html += `<p class="why">${esc(day.why)}</p>`;
  day.sections.forEach((sec, si) => {
    html += `<h3>${esc(sec.name)}</h3><ol class="items">`;
    sec.items.forEach((it, ii) => { html += item(it, `${key}/${si}/${ii}`); });
    html += '</ol>';
  });
  return html;
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
      const vlink = x.video ? `<li class="vlink"><a href="#video-${x.video}">▶ Xem video cách làm</a></li>` : '';
      const body = lines.length
        ? `<details data-id="${esc(sid)}"${opened.has(sid) ? ' open' : ''}><summary class="row">${head}</summary>` +
          `<ul class="how">${lines.map(l => `<li>${esc(l)}</li>`).join('')}${vlink}</ul></details>`
        : `<div class="row plain">${head}</div>`;
      html += `<li${btn ? ' class="g"' : ''}>${body}${btn}</li>`;
    });
    html += '</ul>';
  }
  return html + '</div></li>';
}

const STATE_LABEL: Record<P.State, string> = {
  out: 'chưa có kế hoạch', rest: 'nghỉ chạy', done: 'đã tập', missed: 'chưa tập', open: 'hôm nay, chưa tập', future: 'sắp tới',
};

const FEEL_ICON: Record<P.Feel, string> = { easy: '🙂', ok: '👌', hard: '😓', cramp: '🦵' };

/** The calendar: every week from the start of the plan to the race, one cell per day. A past day keeps the file it
 *  was trained with, so pressing a cell shows what was really planned that day. */
function renderCal(todayKey: P.DayKey, selected: P.DayKey): void {
  const sum = plan.summary(todayKey, state.done);
  $('stats').innerHTML = state.loaded
    ? `<div><b>${sum.done}</b><span>buổi đã tập</span></div><div><b>${sum.missed}</b><span>buổi chưa tập</span></div>` +
      `<div><b>${Math.max(0, sum.daysToRace)}</b><span>ngày đến giải</span></div>`
    : '<p class="muted">Đang tải…</p>';
  let html = '<div class="wk head"><span></span>' +
    ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => `<span class="dh">${d}</span>`).join('') + '</div>';
  let lastMonth = '';
  for (let mon = P.weekStart(P.START); mon <= P.RACE; mon = P.addDays(mon, 7)) {
    const month = 'T' + (dateOf(mon).getMonth() + 1);
    html += `<div class="wk"><span class="wl">${month === lastMonth ? '' : month}</span>`;
    lastMonth = month;
    for (let i = 0; i < 7; i++) {
      const k = P.addDays(mon, i);
      const st = plan.stateOf(k, todayKey, state.done);
      const feel = state.feel.get(k);
      const cls = `cell s-${st}${k === todayKey ? ' today' : ''}${k === selected && location.hash.startsWith('#day-') ? ' sel' : ''}`;
      const text = `${dateOf(k).getDate()}${feel ? `<i class="fi">${FEEL_ICON[feel]}</i>` : ''}${k === P.RACE ? '<i class="flag">🏁</i>' : ''}`;
      const d = plan.dayOf(k);
      if (!d) html += `<span class="${cls}">${text}</span>`;
      else {
        const label = st === 'done' && feel ? `đã tập, ${P.FEEL_LABEL[feel].toLowerCase()}` : STATE_LABEL[st];
        html += `<a class="${cls}" href="#day-${k}" aria-label="${esc(longDay(k))}: ${esc(d.title)}, ${esc(label)}">${text}</a>`;
      }
    }
    html += '</div>';
  }
  $('grid').innerHTML = html;
}

/** The Bài tập tab: one card per exercise with the picture of the video. The video itself (YouTube) loads only
 *  when ▶ is pressed, so the page stays light. */
function renderVideos(): void {
  let html = '';
  for (const g of GROUPS) {
    html += `<h3>${esc(g.name)}</h3>`;
    for (const k of g.keys) {
      const v = VIDEOS[k];
      html += `<div class="vcard" id="v-${k}"><p class="vname">${esc(v.name)}</p>` +
        `<div class="video" data-id="${esc(v.id)}" data-name="${esc(v.name)}"><img src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="" loading="lazy">` +
        `<button class="vplay" type="button" aria-label="Xem video: ${esc(v.name)}">▶</button></div>` +
        `<p class="note">${esc(v.note)}</p><p class="vby">Video: ${esc(v.by)}</p></div>`;
    }
  }
  $('video-list').innerHTML = html;
}

function playVideo(box: HTMLElement): void {
  const id = box.dataset['id'] ?? '';
  box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}?autoplay=1&rel=0" title="${esc(box.dataset['name'] ?? '')}" ` +
    'allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
}

function renderRace(): void {
  $('race-body').innerHTML = dayHtml(plan.dayOf(P.RACE) ?? P.raceDay(), P.RACE);
}

// ---------- tabs ----------
// The panels are named panel-today and so on, not today, so the browser does not jump to them
// and hide the top of the page under the sticky header.
function showTab(): void {
  const h = location.hash;
  const raceWeek = P.today() >= P.RACE_TAB_FROM;
  $('tab-race').hidden = !raceWeek;
  const video = /^#video(-([a-z]+))?$/.exec(h);
  const name = h === '#cal' ? 'cal' : video ? 'video' : h === '#race' && raceWeek ? 'race' : 'today';
  for (const t of ['today', 'cal', 'video', 'race']) {
    $('panel-' + t).classList.toggle('active', t === name);
    $('tab-' + t).classList.toggle('active', t === name);
    $('tab-' + t).setAttribute('aria-selected', t === name ? 'true' : 'false');
  }
  render();
  window.scrollTo(0, 0);
  // #video-deadbug (the link in a how-to): scroll to that exercise
  const key = video?.[2];
  if (key && key in VIDEOS) document.getElementById('v-' + (key as VideoKey))?.scrollIntoView({ block: 'start' });
}

// ---------- live data ----------
function onData(snap: QuerySnapshot<DocumentData>): void {
  state.done = new Set(snap.docs.map(d => d.id).filter(P.isDayKey));
  state.feel = new Map();
  for (const d of snap.docs) {
    const f: unknown = d.get('feel');
    if (P.isDayKey(d.id) && P.isFeel(f)) state.feel.set(d.id, f);
  }
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
  renderVideos();
  $('video-list').addEventListener('click', e => {
    const box = (e.target as Element).closest<HTMLElement>('.video');
    if (box && !box.querySelector('iframe')) playVideo(box);
  });
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
    const t = e.target as Element;
    const fb = t.closest<HTMLElement>('[data-feel]');
    if (fb) {
      const f = fb.dataset['feel'];
      if (P.isFeel(f)) setFeel(selectedDay(), f);
    } else if (t.closest('#mark-btn')) toggle(selectedDay());
  });
  // The page may stay open on the phone for days: draw again when it comes back, so "today" is right.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  window.addEventListener('online', () => setStatus(''));
  window.addEventListener('offline', () => setStatus('Mất mạng. Bấm vẫn được, sẽ gửi sau.', true));
  listen();
}

init();
