# Trani

A small website for one training plan: the 65 km race at Núi Dinh on Sunday
27 December 2026 (4000 m of climbing). Alpha built it on 2026-10-21 for Iker.

The page is on GitHub Pages: https://programever.github.io/trani/

It has two tabs. The text on the page is in Vietnamese, like the plan.

- **Hôm nay (Today).** The whole day, in three parts: Sáng, Trưa, Tối
  (morning, noon, evening). Each part is a list with a time: what to eat, what
  to train (with every exercise, how long or how many times, and how), and
  when to stretch and sleep. Iker follows the list as it is. Under the date is
  one big button: "done". Press it again to take the mark away.
  Tap an exercise to open or close its how-to.
- **Voice guide for core.** Every core exercise has a ▶ button. One tap plays
  one set: a bar at the bottom shows a big timer, and Rebo's voice (Hoài My)
  names the set, counts "3, 2, 1, bắt đầu", then counts the seconds (plank) or
  every repetition. There is no rest timer: Iker taps ▶ again when ready
  (Iker, 2026-10-21). The screen stays on while a set runs.
- **Lịch (Plan).** All the weeks, from Wednesday 21 October to the race. One
  box per day. Green means done. Grey with a dashed line means the day is past
  and not done. Blue means a day without running (Monday). Press a box to see
  that day. Past days can still be marked.

## The plan

All of it is in `src/plan.ts`. Iker and Alpha wrote it on 2026-10-21.

- Iker trains at home only: one floor of stairs (20 steps) and two resistance
  bands, one short and one long. No gym, no treadmill (Iker, 2026-10-21).
- Iker's free times: weekdays 07:30-08:15 and 17:45-18:45, Saturday
  17:00-19:00, and Sunday for the long run or Núi Dinh.
- Weeks: a start week, weeks 1-3 build up, week 4 is lighter, weeks 5-7 build
  up, week 8 and the race week are lighter.
- Núi Dinh on Sunday 1 Nov, 15 Nov and 6 Dec (the race rehearsal).
- Meals only say how big they are (light, normal, heavy) and what they are rich
  in (carbs, protein). No dishes: Iker chooses the food (2026-10-21).

| Day | Session |
|---|---|
| Monday | No running. Core and stretching at home |
| Tuesday | Morning easy run (most weeks). Evening: hard stair intervals |
| Wednesday | Morning easy run (some weeks). Evening: home session A, legs and core |
| Thursday | Evening: steady stairs, later with a backpack |
| Friday | Morning easy run. Evening: home session B, arms for the poles, calves, core |
| Saturday | Evening: 1 to 2 hours on bridges and slopes |
| Sunday | Long run in the city, or Núi Dinh |

## The data

There is no server of our own. The data lives in the same Firestore database
(Google's online database) as Haba: project `habits-433f8`, in a list called
`trani`. A done day is one small document. Its name is the day, and it holds
the day again: `trani/2026-10-21` = `{"day": "2026-10-21"}`. No document means
not done.

The Firebase config block at the top of `src/app.ts` is public by design. It
only names the project. What protects the data is the set of rules in the
Firebase console (Firestore Database, Rules tab). Haba, Trani and Cismo share
one set of rules, so **always paste the whole block below**, never only one
part. If you paste only one app's part, the other apps stop working. The same
block is in the READMEs of all three apps; keep them the same.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /records/{id} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasOnly(['t', 'item'])
        && request.resource.data.t is string
        && request.resource.data.t.size() == 25
        && request.resource.data.item in ['core', 'jog', 'read', 'meditate', 'kid', 'wife', 'spend', 'drink', 'work', 'problem', 'happy', 'normal', 'sad'];
      allow delete: if true;
      allow update: if false;
    }
    match /trani/{day} {
      allow read: if true;
      allow create: if day.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
        && request.resource.data.keys().hasOnly(['day'])
        && request.resource.data.day == day;
      allow delete: if true;
      allow update: if false;
    }
    match /cismo/{key}/events/{id} {
      allow read, delete: if key.size() >= 20;
      allow create: if key.size() >= 20
        && request.resource.data.keys().hasOnly(['t', 'kind'])
        && request.resource.data.t is string
        && request.resource.data.t.size() == 25
        && request.resource.data.kind in ['won', 'smoked'];
      allow update: if false;
    }
    match /cismo/{key}/reasons/{id} {
      allow read, delete: if key.size() >= 20;
      allow create: if key.size() >= 20
        && request.resource.data.keys().hasOnly(['text', 'n'])
        && request.resource.data.text is string
        && request.resource.data.text.size() <= 300
        && request.resource.data.n is int;
      allow update: if false;
    }
  }
}
```

In plain words, for Trani: anyone can read, anyone can add a document whose
name is a date and which holds only that date, anyone can delete, nobody can
change a document after it is written.

## Haba marks

When a training day is marked done, Trani also marks it in Haba, for that day
(Iker, 2026-10-21). A day with running marks Jogging. A day with core
exercises (the ones with the voice guide) marks Core. A day with both marks
both. A stairs-only day marks nothing. When "done" is taken away, Trani removes
those Haba marks of that day again. Haba allows one mark per item per day, so
nothing is counted twice. The code is `src/haba-mark.ts`, a copy of
`haba/shared/haba-mark.ts`, and `habaItems()` in `src/plan.ts`.

## Files

| File | What it is |
|---|---|
| `src/index.html` | The page. Both tabs. |
| `src/style.css` | The look. Light and dark mode. |
| `src/plan.ts` | The whole plan (training and meal types) and the day maths. No browser things, so it can be tested with node. |
| `src/app.ts` | The page logic: the done button, Firestore, drawing the tabs. |
| `src/guide.ts` | What the voice says and the screen shows, second by second, in one core set. Tested with node. |
| `src/player.ts` | Plays a set: the bar at the bottom, the timers, the sound, keeping the screen on. |
| `src/voice.mp3`, `src/voice.ts` | All voice lines in one sound file, and where each line starts. Made by `tools/make-voice.mjs`. |
| `tools/make-voice.mjs` | Makes the voice with edge-tts (Microsoft's free voice, `vi-VN-HoaiMyNeural`, like Rebo) and ffmpeg. Run it after changing a line in `src/guide.ts`; the tests fail until you do. It asks the service only once, for all 30 lines together, and cuts the sound where each sentence ends: the free service refuses for a long time when asked many times in a row. The voice is the same for every day, so it is made once, not daily. |
| `src/manifest.webmanifest`, `src/icon*` | Home-screen icon and app name. |
| `test/plan.test.ts` | Tests for the plan and the day maths. |
| `test/browser.test.ts` | Test of the whole page in a headless browser against the real database. It marks one day and puts it back as it was. |
| `build.mjs` | The build: bundles `src/app.ts` with Firebase into `dist/app.js`, copies the static files. |
| `.github/workflows/deploy.yml` | Build and deploy on every push to `main`. |

Everything is TypeScript. The build turns it into one JavaScript file.

## Build and deploy

Every push to `main` runs the workflow in `.github/workflows/deploy.yml` on
GitHub's machines. It installs the tools, type-checks, runs the tests, builds
`dist/`, and pushes `dist/` to the `gh-pages` branch as one fresh commit.
GitHub Pages serves that branch. It takes about one minute.

On a computer:

```
npm install            # once
npm test               # type-check and plan tests
npm run build          # makes dist/
npm run serve          # opens dist/ on http://127.0.0.1:8766
npm run test:browser   # needs: npx playwright install chromium
```

`main` is kept as one squashed commit, like Haba, and `gh-pages` is rebuilt as
one fresh commit on every deploy. Both are force-pushed. That is fine here: the
repo is small and only Alpha writes to it.

## Rules of the days

- A day starts at 04:00, not at midnight, like Haba. A press at 01:00 counts
  for the evening before.
- Weeks start on Monday.
- Rest days (Mondays) and future days cannot be marked.
