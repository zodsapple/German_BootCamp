# German_BootCamp

The app now opens in **德语 · 宫廷对决**, a bilingual A2–B1 rhythm battle prototype. The original 30-day course remains available through **原课程**, or the `#course` URL fragment.

The MVP includes five reviewed questions in each of three battles:

| Battle | Opponent | Content |
| --- | --- | --- |
| Prepositions and articles | 大橘 | Masculine, feminine, neuter and plural articles in context |
| Adjective endings | 皇后 | Five common A2–B1 adjective patterns |
| Vocabulary storm | 容嬷嬷 | School and daily-life vocabulary drawn from Day 1 and Day 7 |

Correct answers hit immediately; three consecutive correct answers trigger heavy-hit effects. A wrong answer or timeout costs one of three hearts. The result screen offers another round using missed and unseen questions. High scores and full five-question clears are stored in the browser.

## Run and check

From `bootcamp-app`, run `npm install`, then `npm run dev`. Use `npm run build` for the existing GitHub Pages deployment and `npm run test:battle` for content and combat checks.

## Rhythm and voices

The MVP uses a synthesized **96 BPM** instrumental and prerecorded German phrase samples. Eight beats give a five-second answer window; feedback lasts at least four beats, extends to a bar boundary, and allows the entire phrase and any echo to finish. Answers are spoken after resolution; the Rap preview sequences four phrases over the beat. This is rhythmic speech sampling, rather than a generated sung Rap performance.

Start and Resume unlock one shared Web Audio context directly from a click. Where supported, the optional [Audio Session API](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type) declares playback audio and restores the previous session type on exit. Each battle preloads and decodes its five MP3 files before timing begins. Switching away pauses the battle; resuming an unanswered question provides a fresh count-in and answer window. Feedback can also be paused for reading. Audio failures expose a silent-play option.

Audio assets are committed under `bootcamp-app/public/audio/battle`. To regenerate them, use the project Python environment with `gtts` installed and run `python generate_battle_audio.py` from the repository root. Only the short German phrases are sent to Google TTS; available vocabulary recordings are reused from the existing course. Use `--force` to replace existing samples. No speech service is called during play.

Question data and bilingual explanations live in `bootcamp-app/src/battle/questions.json`. The planned full content sizes are **60 / 60 / 80**; this MVP deliberately contains **5 / 5 / 5**. Keep each future question contextual and single-answer, and review noun gender, inflection, distractors and audio before expanding the bank.

Desktop Chromium and phone-sized layouts can be checked locally. Actual iPhone Safari playback, silent-switch behavior and interruption recovery still require a real-device check.
