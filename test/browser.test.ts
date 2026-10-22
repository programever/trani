// Test of the whole page in a headless browser, against the real Firestore.
// It marks one day as done and not done, and leaves it as it was before. It picks a day that is not done yet,
// so a feel Iker gave is never lost (a feel lives in the same document as "done").
// Haba is faked: the test checks the Jogging and Core marks a done day sends, without writing to the real Haba.
// Build first (npm run build), then: npm run test:browser
// To test the live site instead: TRANI_URL=https://programever.github.io/trani/ npm run test:browser
process.env.TZ = 'Asia/Ho_Chi_Minh';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { chromium, type Page } from 'playwright';
import * as P from '../src/plan.ts';
import { RECIPES } from '../src/days.generated.ts';

const plan = P.makePlan(RECIPES);
const isDone = (page: Page): Promise<boolean> => page.locator('#mark .done-box').count().then(n => n > 0);

async function waitFor(page: Page, done: boolean): Promise<void> {
  await page.waitForSelector(done ? '#mark .done-box' : '#mark button.mark', { timeout: 20000 });
  await page.waitForFunction(() => !document.querySelector('#mark')!.textContent!.includes('đang lưu'), null, { timeout: 20000 });
}

test('the page shows the plan and saves a done day', async () => {
  let url = process.env['TRANI_URL'];
  let server: ChildProcess | null = null;
  if (!url) {
    server = spawn('python3', ['-m', 'http.server', '8766', '--bind', '127.0.0.1', '--directory', 'dist'], { stdio: 'ignore' });
    await new Promise(r => setTimeout(r, 800));
    url = 'http://127.0.0.1:8766/index.html';
  }
  const today = P.today();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Ho_Chi_Minh', deviceScaleFactor: 2 });
    // Haba is faked here: a done day marks Jogging and/or Core in Haba, and the test must never touch Iker's
    // real Haba. Only Haba's records are faked; Trani's own done day still goes to the real database.
    const habaWrites: string[] = [];
    await ctx.route(u => u.href.includes('/documents:runQuery') || u.href.includes('/documents/records'), async route => {
      const req = route.request();
      if (req.url().includes(':runQuery')) return route.fulfill({ json: [{ readTime: 'x' }] });
      if (req.method() === 'POST') habaWrites.push(req.postDataJSON().fields.item.stringValue);
      return route.fulfill({ json: {} });
    });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(url + '#week');
    await page.waitForSelector('.stats b', { timeout: 20000 });
    await page.screenshot({ path: '/tmp/trani-week.png', fullPage: true });
    assert.equal(await page.locator('#week > .dayrow').count(), 8, 'today and the next 7 days');
    assert.equal(await page.locator('#status').innerText(), '', 'no error message');

    await page.goto(url + '#race');
    await page.waitForSelector('#race-body h2', { timeout: 20000 });
    assert.match(await page.locator('#race-body').innerText(), /02:00[\s\S]*16 tiếng/, 'the race page');

    // The test day: the latest day up to today that can be marked and is not done yet.
    let day = today, before = true;
    for (let i = 0; i < 10 && before; i++) {
      const k = P.addDays(today, -i);
      if (!plan.canMark(k, today)) continue;
      await page.goto(url + '#day-' + k);
      await page.waitForSelector('#mark .done-box, #mark button.mark', { timeout: 20000 });
      day = k;
      before = await isDone(page);
    }
    assert.equal(await page.locator('#panel-today h2').innerText(), plan.dayOf(day)!.title);
    await page.screenshot({ path: '/tmp/trani-day.png', fullPage: true });
    if (before) {
      // Every day that can be marked is done already: pressing would lose Iker's feel, so the rest is skipped.
      console.log('every markable day is done: the done and feel part is skipped today');
      assert.deepEqual(errors, [], 'no page errors');
      return;
    }

    // press twice: the day changes, then goes back to how it was
    await page.click('#mark-btn');
    await waitFor(page, true);
    assert.equal(await page.locator('#feel .feel-btn').count(), 4, 'the feel buttons appear under done');
    const rowOf = page.locator(`#week a[href="#day-${day}"]`);
    assert.equal(await rowOf.evaluate(e => e.classList.contains('s-done')), true, 'the 7-day tab agrees');

    // a second tab sees the same data
    const page2 = await ctx.newPage();
    await page2.goto(url + '#day-' + day);
    await waitFor(page2, true);
    await page2.close();

    await page.screenshot({ path: '/tmp/trani-done.png', fullPage: true });
    await page.click('#mark-btn');
    await waitFor(page, false);
    // The first press was "done": it sent the day's Haba marks once.
    for (let i = 0; i < 50 && habaWrites.length < P.habaItems(plan.dayOf(day)!).length; i++) await page.waitForTimeout(100);
    assert.deepEqual(habaWrites, P.habaItems(plan.dayOf(day)!), 'Haba marks of the day');

    assert.deepEqual(errors, [], 'no page errors');
  } finally {
    await browser.close();
    server?.kill();
  }
});
