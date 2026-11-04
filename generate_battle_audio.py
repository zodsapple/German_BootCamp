"""Prepare short German vocal samples for the 96 BPM battle demo."""

import argparse
import json
from pathlib import Path
import shutil
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from gtts import gTTS

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "bootcamp-app/src/battle/questions.json"
OUTPUT = ROOT / "bootcamp-app/public/audio/battle"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--only", nargs="*")
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    chapters = json.loads(DATA.read_text(encoding="utf-8"))
    questions = [question for chapter in chapters for question in chapter["questions"]]
    manifest_path = OUTPUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}

    def generate(question):
        target = OUTPUT / f"{question['id']}.mp3"
        if target.exists() and target.stat().st_size > 1000 and not args.force and manifest.get(question["id"], question["chant"]) == question["chant"]:
            return "Cached"
        source = question.get("source")
        if source:
            day = json.loads((ROOT / f"bootcamp-app/src/data/day{source['day']}.json").read_text(encoding="utf-8"))
            index = next(i for i, word in enumerate(day["vocab"]) if word["word"] == source["word"])
            existing = ROOT / f"bootcamp-app/public/audio/day{source['day']}/vocab_{index}_word.mp3"
            if existing.exists() and existing.stat().st_size > 1000:
                shutil.copyfile(existing, target)
                return "Reused"
        temporary = target.with_suffix(".tmp")
        for attempt in range(3):
            try:
                gTTS(text=question["chant"] + ".", lang="de", slow=False, timeout=(8, 20)).save(str(temporary))
                temporary.replace(target)
                return "Generated"
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(1 + attempt * 2)

    selected = [question for question in questions if args.only is None or question["id"] in args.only]
    failures = []
    with ThreadPoolExecutor(max_workers=max(1, min(6, args.workers))) as executor:
        futures = {executor.submit(generate, question): question for question in selected}
        for number, future in enumerate(as_completed(futures), 1):
            question = futures[future]
            try:
                result = future.result()
                manifest[question["id"]] = question["chant"]
                print(f"{number}/{len(selected)} {result}: {question['id']}", flush=True)
            except Exception as error:
                failures.append(question["id"])
                print(f"FAILED {question['id']}: {error}", flush=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if failures:
        raise SystemExit(f"Missing audio: {', '.join(failures)}")
    print(f"Ready: {len(list(OUTPUT.glob('*.mp3')))} vocal samples", flush=True)


if __name__ == "__main__":
    main()
