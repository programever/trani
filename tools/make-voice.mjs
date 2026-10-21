// Makes the voice for the guided core sets: src/voice.mp3 (all lines in one file) and src/voice.ts (where each line is).
// Run it again after changing VOICE_LINES in src/guide.ts:  node tools/make-voice.mjs
// Needs edge-tts (Microsoft's free voice, the same voice as Rebo: vi-VN-HoaiMyNeural) and ffmpeg.
// It uses Rebo's edge-tts on Alpha's box, or the one in EDGE_TTS, or edge-tts on the PATH.
//
// The free service refuses for a long time when it is asked many times in a row (2026-10-21). So the tool asks
// only ONCE, for all lines together, one sentence per line. edge-tts also writes where each sentence starts and
// ends (subtitles), and the tool cuts the sound there. The answer is kept in a cache, so a second run asks nothing.
// The page plays one file and jumps to each line: on an iPhone that is faster and safer than many small files.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { VOICE_LINES } from '../src/guide.ts';

const VOICE = 'vi-VN-HoaiMyNeural';
const RATE = 24000;          // samples per second, mono
const START = 0.6;           // silence at the start of the file: the page plays it on the first tap, so an iPhone allows sound later
const LEAD = 0.15;           // silence before each line, seconds
const GAP = 0.5;             // silence after each line, seconds
const rebo = join(homedir(), 'rebo/.venv/bin/edge-tts');
const edge = process.env.EDGE_TTS || (existsSync(rebo) ? rebo : 'edge-tts');

const ids = Object.keys(VOICE_LINES);
const text = ids.map(id => VOICE_LINES[id]).join(' ');
const cache = join(tmpdir(), 'trani-voice-cache');
mkdirSync(cache, { recursive: true });
const base = join(cache, 'all-' + createHash('sha1').update(VOICE + text).digest('hex'));

// 1. One request, tried again with longer waits when the service refuses.
for (let i = 1; !existsSync(base + '.mp3'); i++) {
  try {
    execFileSync(edge, ['--voice', VOICE, '--text', text, '--write-media', base + '.part.mp3', '--write-subtitles', base + '.srt'],
      { stdio: 'pipe', timeout: 120000 });
    renameSync(base + '.part.mp3', base + '.mp3');
  } catch (e) {
    if (i >= 6) throw new Error(`edge-tts failed 6 times: ${String(e.stderr ?? e).trim().split('\n').pop()}`);
    console.log(`edge-tts refused (try ${i}), waiting ${60 * i} seconds`);
    execFileSync('sleep', [String(60 * i)]);
  }
}

// 2. Where each sentence is, from the subtitles: "00:00:01,250 --> 00:00:02,100".
const sec = (t) => { const [h, m, s] = t.replace(',', '.').split(':'); return Number(h) * 3600 + Number(m) * 60 + Number(s); };
const spans = [...readFileSync(base + '.srt', 'utf8').matchAll(/(\d+:\d+:\d+[,.]\d+) --> (\d+:\d+:\d+[,.]\d+)/g)]
  .map(m => [sec(m[1]), sec(m[2])]);
if (spans.length !== ids.length) {
  throw new Error(`expected ${ids.length} sentences, the service found ${spans.length}: every line in VOICE_LINES must be one sentence`);
}

// 3. Cut each sentence out, with a little room, and lay them out one after the other with silence between.
const all = execFileSync('ffmpeg', ['-v', 'error', '-i', base + '.mp3', '-f', 's16le', '-ac', '1', '-ar', String(RATE), '-'], { maxBuffer: 1 << 28 });
const at = (s) => Math.max(0, Math.min(all.length, Math.round(s * RATE) * 2));
const silence = (s) => Buffer.alloc(Math.round(s * RATE) * 2);
const parts = [silence(START)];
const table = {};
let pos = START;
ids.forEach((id, i) => {
  const [from, to] = spans[i];
  const next = spans[i + 1]?.[0] ?? to + 1;
  const pcm = all.subarray(at(Math.max(0, from - 0.05)), at(Math.min(to + 0.15, next - 0.02)));
  const len = pcm.length / 2 / RATE;
  table[id] = [Number(pos.toFixed(3)), Number((LEAD + len + 0.05).toFixed(3))];
  parts.push(silence(LEAD), pcm, silence(GAP));
  pos += LEAD + len + GAP;
});
const raw = base + '.raw';
writeFileSync(raw, Buffer.concat(parts));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-i', raw,
  '-codec:a', 'libmp3lame', '-b:a', '40k', 'src/voice.mp3']);

writeFileSync('src/voice.ts', `// Made by tools/make-voice.mjs. Do not edit by hand.
// Where each voice line is in voice.mp3: [start in seconds, length in seconds].
export const VOICE: Record<string, readonly [number, number]> = ${JSON.stringify(table, null, 2)};

/** The text the sound was made from. The tests check it still matches VOICE_LINES in guide.ts. */
export const VOICE_TEXT: Record<string, string> = ${JSON.stringify(VOICE_LINES, null, 2)};
`);
console.log(`${ids.length} lines, ${pos.toFixed(1)} seconds, ${readFileSync('src/voice.mp3').length} bytes`);
