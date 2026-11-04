# German_BootCamp

The app now opens in **德语 · 宫廷对决**, a bilingual A2–B1 rhythm battle prototype. The original 30-day course remains available through **原课程**, or the `#course` URL fragment.

The app includes **200 bilingual questions**, each with a prerecorded German voice sample:

| Battle | Opponent | Content |
| --- | --- | --- |
| Prepositions and articles | 大橘 | 60 questions: fixed-case and two-way prepositions, all genders and plurals |
| Adjective endings | 皇后 | 60 questions: weak, mixed and strong endings across nominative, accusative and dative |
| Vocabulary storm | 容嬷嬷 | 80 words: 45 drawn from Day 1–10, plus school and daily-life vocabulary; 40 questions in each translation direction |

Choose **Normal: 10 seconds** or **Hard: 5 seconds** per answer. The default short round draws up to ten questions, mixing a few weak questions with fresh content. Full-bank practice, topic filters and a dedicated mistake-review mode are also available.

Correct answers hit immediately; three consecutive correct answers trigger heavy-hit effects. A wrong answer or timeout costs one of three hearts. The result screen offers another round using missed and unseen questions. Scores are stored by chapter, difficulty and practice mode. Each answer saves learning progress immediately; two consecutive correct encounters mark an item as fluent, and a subsequent mistake returns it to review. Review dates after one, three and seven days help prioritize future rounds; no notification or account is required.

The opening study guides explain the article/case table, adjective-ending patterns and vocabulary chunks. German uses the bundled **Atkinson Hyperlegible Next** font; Chinese uses a subset of **Noto Sans SC**, with larger question, answer and explanation text. Font licenses are included under `bootcamp-app/public/fonts`.

## Run and check

From `bootcamp-app`, run `npm install`, then `npm run dev`. Use `npm run build` for the existing GitHub Pages deployment and `npm run test:battle` for content and combat checks.

## Rhythm and voices

The game uses a synthesized **96 BPM** instrumental and prerecorded German phrase samples. Hard mode gives eight beats (five seconds); Normal gives sixteen beats (ten seconds). Feedback lasts at least four beats, extends to a bar boundary, and allows the entire phrase and any echo to finish. Answers are spoken after resolution; the Rap preview sequences four phrases over the beat. The current Rap is rhythmic speech sampling.

Start and Resume unlock one shared Web Audio context directly from a click. Where supported, the optional [Audio Session API](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type) declares playback audio and restores the previous session type on exit. Each battle preloads and decodes the selected round's MP3 files before timing begins; Rap preview loads only four samples. Switching away pauses the battle; resuming an unanswered question provides a fresh count-in and a fresh window at the chosen difficulty. Feedback can also be paused for reading. Audio failures expose a silent-play option.

Audio assets and the text-to-sample manifest are committed under `bootcamp-app/public/audio/battle`. To regenerate them, use a Python environment with `gtts` installed and run `python generate_battle_audio.py` from the repository root. Generation reuses valid assets, regenerates changed phrases, and retries failed requests. Use `--force` to replace samples or `--only id1 id2` to target a few questions. Only the short German phrases are sent to Google TTS; available vocabulary recordings are reused from the existing course. No speech service is called during play.

Question data and bilingual explanations live in the single authoritative file `bootcamp-app/src/battle/questions.json`. Keep each future question contextual and single-answer, and review noun gender, inflection, distractors and audio before expanding the bank. After text changes, run `python prepare_battle_fonts.py` with `fonttools[woff]` installed to refresh the bundled font subsets. Missing source fonts are downloaded from the official Google Fonts repository.

## Promotional clip

The 15-second portrait gameplay clip is available at `media/palace-duel-15s.mp4` under the deployed app. It uses actual browser captures and the game's own audio graph, encoded as 720×1280 H.264 video with AAC audio for sharing.

For another recording, add `?capture=1` to a local preview URL. During a battle, the recording button downloads a 15-second game-audio track; it does not access the microphone or other applications. Save timestamped browser frames and `metadata.json` under `artifacts/promo-frames`, save the downloaded track as `artifacts/promo-audio.webm`, then run `python render_battle_promo.py` with `imageio-ffmpeg` and `Pillow` installed. The script normalizes frame sizes, writes a local MP4 and copies it to `bootcamp-app/public/media` for deployment. Raw captures and downloaded font sources remain local under `artifacts`.

Desktop Chromium and phone-sized layouts can be checked locally. Actual iPhone Safari playback, silent-switch behavior and interruption recovery still require a real-device check.
