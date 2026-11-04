# German_BootCamp

The app now opens in **德语 · 宫廷对决**, a bilingual A2–B1 rhythm battle prototype. The original 30-day course remains available through **原课程**, or the `#course` URL fragment.

The app includes **700 bilingual questions**: five grammar chapters with 60 questions each and 400 vocabulary words/chunks, all with prerecorded German speech:

| Battle | Opponent | Content |
| --- | --- | --- |
| Prepositions and articles | 大橘 | 60 questions: fixed-case and two-way prepositions, all genders and plurals |
| Adjective endings | 皇后 | 60 questions: weak, mixed and strong endings across nominative, accusative and dative |
| Verbs and tenses | 华妃 | 60 questions: present forms, modals, separable verbs, Perfekt, common Präteritum and werden |
| Word order and connectors | 沈眉庄 | 60 questions: V2/inversion, questions, verb brackets, subordinate clauses, connectors and zu infinitives |
| Pronouns and case | 甄嬛 | 60 questions: personal/possessive/reflexive pronouns, accusative/dative and explicit reference |
| Vocabulary storm | 容嬷嬷 | 400 distinct words/chunks; 177 sourced from Day 1–10 plus common school/daily-life additions; 200 questions in each translation direction |

Choose **Normal: 10 seconds** or **Hard: 5 seconds** per answer. The default short round draws up to ten questions, mixing a few weak questions with fresh content. Full-bank practice, topic filters and a dedicated mistake-review mode are also available.

Correct answers hit immediately; three consecutive correct answers trigger heavy-hit effects. A wrong answer or timeout costs a heart. Short battles end after three mistakes. **Full sprints do not eliminate the player**: depleted hearts refill before the next question and the entire selected bank is played, including previously studied words. Results offer separate actions for actual mistakes and unanswered questions. Scores are stored by chapter, difficulty and practice mode. Each actual answer saves learning progress; two consecutive correct encounters mark fluency, and an actual mistake returns the item to review. Review dates after one, three and seven days prioritize future rounds.

The existing learning-storage key and original 200 question IDs remain unchanged. Unanswered items never gain a wrong attempt or reset a correct streak. Full-sprint checkpoints store ordered question IDs and actual answers separately from lifetime learning history. After returning or refreshing, select the same chapter/topic in full-sprint mode and use **继续冲刺** to resume at the next unanswered question. **重新开始本轮** resets that round while keeping learning history.

The large **暂停思考** button stays at the top of the question panel while reading. Feedback has a second large pause button so learners can stop and reflect on the explanation. Pausing freezes combat and stops its audio.

Results use actual-answer accuracy: `floor(correct / answered questions × 10)`, independent of speed/combo points. Unanswered questions are excluded from errors and the denominator; partial rounds are capped at nine. Scores 1–10 give **仆人、宫女、答应、常在、贵人、嫔、妃、贵妃、皇后、皇帝**; zero is **初入宫门**. A completed perfect round earns 皇帝. The result screen separates correct/answered, mistakes and unanswered counts and shows the promotion ladder.

The opening study guides explain the article/case table, adjective-ending patterns and vocabulary chunks. German uses the bundled **Atkinson Hyperlegible Next** font; Chinese uses a subset of **Noto Sans SC**, with larger question, answer and explanation text. Font licenses are included under `bootcamp-app/public/fonts`.

## Run and check

From `bootcamp-app`, run `npm install`, then `npm run dev`. Use `npm run build` for the existing GitHub Pages deployment and `npm run test:battle` for content and combat checks.

## Rhythm and voices

The original **96 BPM** instrumental uses separate drum and harmonic stems. ConradNeural leads all 700 phrases; KatjaNeural responds with a grammatical target in all five grammar chapters (300 responses). Vocabulary uses a quieter phrase echo when short enough. Hard mode gives eight beats (five seconds); Normal gives sixteen beats (ten seconds). Feedback extends to a bar boundary and lets both voices finish. A bass impact plays only on correct hits, followed by the teaching voice. The Rap button plays the approved 15-second mix.

Start and Resume unlock one shared Web Audio context directly from a click. Where supported, the optional [Audio Session API](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type) declares playback audio. Voices load through four workers in windows of twelve questions; earlier buffers are released so a 400-word sprint does not decode the whole bank into memory. If the next window is not ready, combat waits without consuming answer time. Delayed frames never consume the next question's time allowance. Two 15-second stems loop on one audio clock; the harmonic stem ducks during speech. Switching away pauses combat, and resuming provides a fresh count-in and answer window. Feedback can also be paused. Audio failures expose a silent-play option.

Audio assets, the text-to-sample manifest and voice provenance are committed under `bootcamp-app/public/audio/battle`, with responses under `audio/echoes`. Run `python generate_neural_battle_audio.py` from the repository root to regenerate the current bank. It sends only the German phrases to the Microsoft Edge online neural TTS service, caches text/voice settings and word timings locally, emphasizes grammatical words and retries failed requests. The old Google TTS generator remains available for reproducing the earlier prototype. No speech service is called during play.

### Approved neural Rap

Open **`listen.html`** for the approved 15-second sample. It combines German ConradNeural lead speech with KatjaNeural responses and an original 96 BPM kick/snare instrumental. The same voice and rhythm style covers all six battle chapters.

To reproduce the audio, install `edge-tts==7.3.1`, `numpy` and `imageio-ffmpeg`. Run `python make_neural_rap_preview.py` for the Rap, two instrumental stems and original impact; run `python generate_neural_battle_audio.py` for the bank. Only short German phrases are sent to the Microsoft Edge online neural TTS service. Stems and word timings are cached locally under `artifacts`. The Rap is a 15-second, 48 kHz stereo MP3 plus AAC-LC M4A with fast-start metadata under `public/audio/previews`.

The mobile audition uses a native audio player, explicit user playback and no autoplay or runtime speech service. MP3 is the primary source, with AAC as an alternative and direct links for both. Actual iPhone Safari start, pause, seeking and replay still require a real-device check.

Question data and bilingual explanations live in the single authoritative file `bootcamp-app/src/battle/questions.json`. Keep each future question contextual and single-answer, and review noun gender, inflection, distractors and audio before expanding the bank. After text changes, run `python prepare_battle_fonts.py` with `fonttools[woff]` installed to refresh the bundled font subsets. Missing source fonts are downloaded from the official Google Fonts repository.

## Promotional clip

The updated 15-second portrait gameplay clip is available at `media/palace-duel-15s.mp4` under the deployed app. It uses actual browser captures with three consecutive correct hits, the Bomb effect and the game's new neural voices/music, encoded as 720×1280 H.264 video with AAC audio for sharing.

The extended **30-second demo** is at `media/palace-duel-30s.mp4`. It shows five real correct answers, then roughly seven seconds of the actual **10/10 皇帝** result, 5/5 accuracy, combo statistics and the expanded court-title ladder. Quiet waits are shortened in the edit; the score scene has an instrumental bed and a short rising chime.

For another recording, add `?capture=1` to a local preview URL, or `?capture=1&seconds=30` for thirty seconds. During a battle, the recording button prepares the game-audio track and exposes a download link after completion; it does not access the microphone or other applications. Save timestamped browser frames and `metadata.json` under `artifacts/promo-frames`, save the downloaded track as `artifacts/promo-audio.webm`, then run `python render_battle_promo.py` with `imageio-ffmpeg` and `Pillow` installed. Use `--frames` and `--audio` to choose another capture set; the metadata's `duration` selects the output length and filename. The script normalizes frame sizes, writes a local MP4 and copies it to `bootcamp-app/public/media` for deployment. Raw captures and downloaded font sources remain local under `artifacts`.

Desktop Chromium and phone-sized layouts can be checked locally. Actual iPhone Safari playback, silent-switch behavior and interruption recovery still require a real-device check.
