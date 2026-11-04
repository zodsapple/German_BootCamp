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

The large **暂停思考** button stays at the top of the question panel while reading. Feedback has a second large pause button so learners can stop and reflect on the explanation. Pausing freezes combat and stops its audio.

Results now award a court title from accuracy: `floor(correct / planned questions × 10)`, independent of speed/combo battle points. Unanswered questions after defeat remain in the denominator. Scores 1–10 give **仆人、宫女、答应、常在、贵人、嫔、妃、贵妃、皇后、皇帝**; zero is **初入宫门**. A perfect round of any length earns 皇帝. The result screen includes the full promotion ladder.

The opening study guides explain the article/case table, adjective-ending patterns and vocabulary chunks. German uses the bundled **Atkinson Hyperlegible Next** font; Chinese uses a subset of **Noto Sans SC**, with larger question, answer and explanation text. Font licenses are included under `bootcamp-app/public/fonts`.

## Run and check

From `bootcamp-app`, run `npm install`, then `npm run dev`. Use `npm run build` for the existing GitHub Pages deployment and `npm run test:battle` for content and combat checks.

## Rhythm and voices

The game uses an original **96 BPM** instrumental with separate drum and harmonic stems, and prerecorded German neural phrase samples. ConradNeural leads all 200 phrases; KatjaNeural responds with the key article or adjective in both grammar chapters (120 responses). Vocabulary uses a quieter phrase echo when short enough. Hard mode gives eight beats (five seconds); Normal gives sixteen beats (ten seconds). Feedback lasts at least four beats, extends to a bar boundary, and lets both voices finish. A short bass impact plays only on correct hits, followed by the teaching voice; wrong answers retain their existing cue. The Rap button plays the approved 15-second call-and-response mix.

Start and Resume unlock one shared Web Audio context directly from a click. Where supported, the optional [Audio Session API](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type) declares playback audio and restores the previous session type on exit. Each battle preloads and decodes its MP3 voices, responses, drum/music loops and impact before timing begins; the Rap preview loads its single finished mix. Two 15-second stems loop on the same audio clock; only the harmonic stem ducks during speech so the beat remains clear. Switching away pauses the battle; resuming an unanswered question provides a fresh count-in and a fresh window at the chosen difficulty. Feedback can also be paused for reading. Audio failures expose a silent-play option.

Audio assets, the text-to-sample manifest and voice provenance are committed under `bootcamp-app/public/audio/battle`, with responses under `audio/echoes`. Run `python generate_neural_battle_audio.py` from the repository root to regenerate the current bank. It sends only the German phrases to the Microsoft Edge online neural TTS service, caches text/voice settings and word timings locally, emphasizes grammatical words and retries failed requests. The old Google TTS generator remains available for reproducing the earlier prototype. No speech service is called during play.

### Approved neural Rap

Open **`listen.html`** for the approved 15-second sample. It combines German ConradNeural lead speech with KatjaNeural article responses, article emphasis, an original 96 BPM kick/snare instrumental and ducking under the lead. The same voice and rhythm style now covers all three battle chapters.

To reproduce the audio, install `edge-tts==7.3.1`, `numpy` and `imageio-ffmpeg`. Run `python make_neural_rap_preview.py` for the Rap, two instrumental stems and original impact; run `python generate_neural_battle_audio.py` for the bank. Only short German phrases are sent to the Microsoft Edge online neural TTS service. Stems and word timings are cached locally under `artifacts`. The Rap is a 15-second, 48 kHz stereo MP3 plus AAC-LC M4A with fast-start metadata under `public/audio/previews`.

The mobile audition uses a native audio player, explicit user playback and no autoplay or runtime speech service. MP3 is the primary source, with AAC as an alternative and direct links for both. Actual iPhone Safari start, pause, seeking and replay still require a real-device check.

Question data and bilingual explanations live in the single authoritative file `bootcamp-app/src/battle/questions.json`. Keep each future question contextual and single-answer, and review noun gender, inflection, distractors and audio before expanding the bank. After text changes, run `python prepare_battle_fonts.py` with `fonttools[woff]` installed to refresh the bundled font subsets. Missing source fonts are downloaded from the official Google Fonts repository.

## Promotional clip

The updated 15-second portrait gameplay clip is available at `media/palace-duel-15s.mp4` under the deployed app. It uses actual browser captures with three consecutive correct hits, the Bomb effect and the game's new neural voices/music, encoded as 720×1280 H.264 video with AAC audio for sharing.

For another recording, add `?capture=1` to a local preview URL. During a battle, the recording button prepares a 15-second game-audio track and exposes a download link after completion; it does not access the microphone or other applications. Save timestamped browser frames and `metadata.json` under `artifacts/promo-frames`, save the downloaded track as `artifacts/promo-audio.webm`, then run `python render_battle_promo.py` with `imageio-ffmpeg` and `Pillow` installed. Use `--frames` and `--audio` to choose another capture set. The script normalizes frame sizes, writes a local MP4 and copies it to `bootcamp-app/public/media` for deployment. Raw captures and downloaded font sources remain local under `artifacts`.

Desktop Chromium and phone-sized layouts can be checked locally. Actual iPhone Safari playback, silent-switch behavior and interruption recovery still require a real-device check.
