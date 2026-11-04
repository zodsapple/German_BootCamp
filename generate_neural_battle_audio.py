"""Generate the approved neural voice bank and grammatical call-and-response clips."""

import asyncio
import json
import re
import subprocess

import edge_tts

from make_neural_rap_preview import ROOT, FFMPEG, SR, decode

STEMS = ROOT / "artifacts/neural-battle-stems"
PUBLIC = ROOT / "bootcamp-app/public/audio"
SETTINGS = {"rate": "+6%", "boundary": "WordBoundary"}


async def main():
    STEMS.mkdir(parents=True, exist_ok=True)
    for folder in ("battle", "echoes"):
        (PUBLIC / folder).mkdir(parents=True, exist_ok=True)
    cache_path = STEMS / "cache.json"
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}
    chapters = json.loads((ROOT / "bootcamp-app/src/battle/questions.json").read_text(encoding="utf-8"))
    jobs, echoes = [], {}
    for chapter in chapters:
        for question in chapter["questions"]:
            text = question["chant"]
            text = text[0].upper() + text[1:] + "."
            emphasis = [question["answer"]] if chapter["id"] != "vocabulary" else []
            jobs.append((question["id"], text, "de-DE-ConradNeural", "battle", emphasis))
            if chapter["id"] != "vocabulary":
                tokens = re.findall(r"[\wäöüÄÖÜß]+", question["chant"])
                echo = question["answer"] if question["answer"] in tokens else tokens[0]
                echoes[question["id"]] = echo
                jobs.append((question["id"] + "-echo", echo + ".", "de-DE-KatjaNeural", "echoes", []))
    semaphore = asyncio.Semaphore(4)
    done = 0

    async def generate(name, text, voice, folder, emphasis):
        nonlocal done
        async with semaphore:
            signature = {"text": text, "voice": voice, **SETTINGS}
            mp3, timing = STEMS / f"{name}.mp3", STEMS / f"{name}.jsonl"
            if cache.get(name) != signature or not mp3.exists() or not timing.exists() or mp3.stat().st_size < 1000:
                for attempt in range(4):
                    try:
                        await edge_tts.Communicate(text, voice, pitch="-1Hz" if "Conrad" in voice else "+1Hz", connect_timeout=12, receive_timeout=30, **SETTINGS).save(str(mp3), str(timing))
                        cache[name] = signature
                        cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                        break
                    except Exception:
                        if attempt == 3:
                            raise
                        await asyncio.sleep(1 + attempt * 2)
            signal = await asyncio.to_thread(decode, name, STEMS, emphasis)
            target_name = name.removesuffix("-echo") if folder == "echoes" else name
            target = PUBLIC / folder / f"{target_name}.mp3"
            await asyncio.to_thread(subprocess.run, [FFMPEG, "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "libmp3lame", "-b:a", "128k", str(target)], input=signal.astype("<f4").tobytes(), check=True)
            done += 1
            if done % 20 == 0 or done == len(jobs):
                print(f"Ready {done}/{len(jobs)}: {name}", flush=True)

    await asyncio.gather(*(generate(*job) for job in jobs))
    manifest = {q["id"]: q["chant"] for chapter in chapters for q in chapter["questions"]}
    (PUBLIC / "battle/manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report = {"version": "neural-v1", "lead": "de-DE-ConradNeural", "response": "de-DE-KatjaNeural", "provider": "Microsoft Edge online neural TTS via edge-tts", "questions": len(manifest), "echoes": echoes, "rate": SETTINGS["rate"]}
    (PUBLIC / "battle/voices.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Complete: {len(manifest)} lead phrases, {len(echoes)} grammar responses", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
