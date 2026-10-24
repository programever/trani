# Trani

A small website for one training plan: the 65 km race at Núi Dinh on Sunday
27 December 2026 (Dinh Harvest Final 2026). Alpha built it on 2026-10-21 for
Iker, and rebuilt it on 2026-10-22 as a plan of seven days at a time.

The page is on GitHub Pages: https://programever.github.io/trani/

The text on the page is in Vietnamese, like the plan. What the plan knows about
Iker is in `docs/iker.md`; what it knows about the race is in `docs/race.md`.

## The page

- **Hôm nay (Today).** The training of the day: the morning session and the
  evening session, with a time, every exercise, how long or how many times,
  how (tap the exercise), and its video. Meals and sleep are in the plan files
  but not shown (Iker, 2026-10-24: "chỉ cần nói sáng tập gì và chiều tập gì");
  the race page shows everything. Under the date is
  one big button: "done". Press it again to take the mark away. Under "done"
  are four buttons for how the session felt: Dễ, Ổn, Nặng, Chuột rút (easy,
  ok, hard, cramp). Press one; press the same one again to clear it.
  When a day is lighter because of a cramp, a blue line under the title says so.
  Tap an exercise to open or close its how-to.
- **Voice guide for core.** Every core exercise has a ▶ button. One tap plays
  one set: a bar at the bottom shows a big timer, and Rebo's voice (Hoài My)
  names the set, counts "3, 2, 1, bắt đầu", then counts the seconds (plank) or
  every repetition. A number means "start the next one": the next number comes
  6 seconds later for dead bug and bird dog, 5 seconds for the bridges, so
  there is time to move out, hold 2 seconds and come back (Iker, 2026-10-22).
  There is no rest timer: Iker taps ▶ again when ready. The screen stays on
  while a set runs.
- **Lịch (Calendar).** The counts (done, not done, days to the race) and
  every week from the start of the plan to the race, one box per day (Iker,
  2026-10-22: to look back at what was trained; the 7-day list was removed the
  same day). Green means done, with a small sign for how it felt (🙂 easy,
  👌 ok, 😓 hard, 🦵 cramp). Grey with a dashed line means past and not done.
  Blue means a rest day. A box with a border is a coming day that has its file
  already (the next seven days); a faint box has none yet. Press a box to see
  that day. A past day keeps the file it was trained with, so the history is
  true.
- **Bài tập (Exercises).** One YouTube video per exercise, in three groups
  (core, legs, arms), with one line that says what to look at. The video loads
  only when ▶ is pressed. The same video is inside every exercise's how-to on
  the Today tab. Iker asked for this on 2026-10-22, because the
  how-to text is not always enough to remember a move. The list is in
  `src/videos.ts`; the videos are in English.
- **Ngày đua (Race day).** The race page: start time, time limit, target pace,
  the gear the organizer asks for, what to do before, during and after. The
  tab appears only in the race week, from Monday 21 December (Iker,
  2026-10-22). Before that, the race day is also readable on the calendar
  once its file exists.

## The plan, seven days at a time

Iker asked on 2026-10-22 not to plan far ahead: only the next seven days, and
a new day every day. So:

- Every day is one small file in `days/`, like `days/2026-10-30.json`. It is a
  *recipe*: the kind of day and the doses (for example: Tuesday, intervals,
  6 x 3 minutes, easy run of 30 minutes in the morning). `src/plan.ts` turns a
  recipe into the full day with meals, how-tos and the voice guide.
- `src/generate.ts` holds the rules: which kind of day each date is (see the
  table below), the weeks that build up and the lighter weeks, and how a day
  changes after how the last days felt.
- Every morning at 05:00 Vietnam time, `tools/daily.sh` runs on Alpha's box
  (user timer `trani.timer`, retry at 06:30). It reads the done days and the
  feel buttons from Firestore, writes the files of today and the next seven
  days, runs the tests, builds, commits and pushes. GitHub Actions then puts the
  new page online in about a minute. By hand: `npm run days` (or
  `npm run days -- --dry-run` to only see what would change).
- A day in the past is never rewritten. Today is not rewritten once it is
  marked done. A file with `"locked": true` is never rewritten: that is how
  Alpha and Iker change a day by hand (edit the file, lock it, commit, push).
  Every other day in the window is written again each morning, so a cramp
  yesterday makes today lighter.
- **A cramp makes the next training day lighter.** When the last training day
  was marked "Chuột rút", or the last two were marked "Nặng", the next training
  day gets fewer sets (one less), shorter intervals (two reps less), shorter
  runs (about a quarter less), and a line under the title that says why. A
  Núi Dinh day keeps its hours but asks to climb slowly and take salt. Cramps
  came about five hours into both slow races (Iker, 2026-10-22), so the plan
  also says: salt and food every hour, slow first half.

Iker's rules for the plan:

- Training at home only: one floor of stairs (20 steps) and two resistance
  bands, one short and one long. No gym, no treadmill (Iker, 2026-10-21).
- Free times: weekdays 07:30-08:15 and 17:45-18:45, Saturday 17:00-19:00, and
  Sunday for the long run or Núi Dinh.
- Núi Dinh only by day: Sunday 1 Nov, 15 Nov and 6 Dec (the race rehearsal).
  No night training on the mountain (Iker, 2026-10-22). Two long runs in the
  park start at 03:00 with the headlamp (29 Nov, 13 Dec), like the race start.
- Weeks: a start week, weeks 1-3 build up, week 4 is lighter, weeks 5-7 build
  up, week 8 and the race week are lighter.
- Meals only say how big they are (light, normal, heavy) and what they are rich
  in (carbs, protein). No dishes: Iker chooses the food (2026-10-21).
- Core at home in the morning, never in the park, never after dinner.

| Day | Session |
|---|---|
| Monday | No running. Core and stretching at home |
| Tuesday | Morning easy run (most weeks). Evening: hard stair intervals |
| Wednesday | Morning easy run (some weeks). Evening: home session A, legs and core |
| Thursday | Evening: steady stairs, later with a backpack |
| Friday | Morning easy run. Evening: home session B, arms for the poles, calves, core |
| Saturday | Evening: 1 to 2 hours on bridges and slopes |
| Sunday | Long run in the city (twice at night in the park), or Núi Dinh by day |

## The data

There is no server of our own. The data lives in the same Firestore database
(Google's online database) as Haba: project `habits-433f8`, in a list called
`trani`. A done day is one small document. Its name is the day, and it holds
the day again and, after a feel button, the feel:
`trani/2026-10-21` = `{"day": "2026-10-21", "feel": "cramp"}`. No document
means not done. The feel words are `easy`, `ok`, `hard`, `cramp`.

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
      allow create, update: if day.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
        && request.resource.data.keys().hasOnly(['day', 'feel'])
        && request.resource.data.day == day
        && (!('feel' in request.resource.data) || request.resource.data.feel in ['easy', 'ok', 'hard', 'cramp']);
      allow delete: if true;
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

In plain words, for Trani: anyone can read, anyone can add or change a
document whose name is a date and which holds only that date and maybe a feel
word, anyone can delete. Before 2026-10-22 a document could not be changed;
the feel buttons need that change, so the rules must be pasted again.

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
| `days/*.json` | One recipe per day: the plan itself. Written by `tools/next-day.ts`, or by hand (then `"locked": true`). |
| `docs/iker.md`, `docs/race.md` | What the plan knows about Iker and about the race. |
| `src/index.html` | The page. The tabs. |
| `src/videos.ts` | One YouTube video per exercise, with what to look at. |
| `src/style.css` | The look. Light and dark mode. |
| `src/plan.ts` | The recipe types, every session and meal, the day maths, and `expand()` from a recipe to a full day. No browser things, so it can be tested with node. |
| `src/generate.ts` | The plan rules: the recipe of any date, the lighter day after a cramp, what the daily job keeps. |
| `src/days.generated.ts` | Made by `tools/gen-days.mjs` from `days/*.json` at build time, not in git. The page carries the days with it, so it works offline. |
| `src/app.ts` | The page logic: the done and feel buttons, Firestore, drawing the tabs. |
| `src/guide.ts` | What the voice says and the screen shows, second by second, in one core set. Tested with node. |
| `src/player.ts` | Plays a set: the bar at the bottom, the timers, the sound, keeping the screen on. |
| `src/voice.mp3`, `src/voice.ts` | All voice lines in one sound file, and where each line starts. Made by `tools/make-voice.mjs`. |
| `tools/next-day.ts` | Writes the recipe files of today and the next seven days (reads Firestore for done days and feels). |
| `tools/daily.sh` | The morning run: next-day, test, build, commit, push. Started by the user timer `trani.timer` on Alpha's box. |
| `tools/gen-days.mjs` | Collects `days/*.json` into `src/days.generated.ts`. Run by `npm run check` and `npm run build`. |
| `tools/make-voice.mjs` | Makes the voice with edge-tts (Microsoft's free voice, `vi-VN-HoaiMyNeural`, like Rebo) and ffmpeg. Run it after changing a line in `src/guide.ts`; the tests fail until you do. It asks the service only once, for all 30 lines together: the free service refuses for a long time when asked many times in a row. |
| `src/manifest.webmanifest`, `src/icon*` | Home-screen icon and app name. |
| `test/plan.test.ts` | Tests for the plan, the rules, the day files and the voice guide. |
| `test/browser.test.ts` | Test of the whole page in a headless browser against the real database. It marks one day that is not done yet and puts it back. |
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
npm run days           # write the day files of today and the next 7 days
npm test               # type-check and plan tests
npm run build          # makes dist/
npm run serve          # opens dist/ on http://127.0.0.1:8766
npm run test:browser   # needs: npx playwright install chromium
npm run daily          # the whole morning run, with commit and push
```

`main` has normal commits: the morning run adds one every day. `gh-pages` is
rebuilt as one fresh commit on every deploy.

## Rules of the days

- A day starts at 04:00, not at midnight, like Haba. A press at 01:00 counts
  for the evening before.
- Weeks start on Monday.
- Rest days (Mondays and 25 December), future days and days without a file
  cannot be marked.
