"""Prepare short German vocal samples for the 96 BPM battle demo."""

import argparse
import json
from pathlib import Path
import shutil

from gtts import gTTS

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "bootcamp-app/src/battle/questions.json"
OUTPUT = ROOT / "bootcamp-app/public/audio/battle"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    chapters = json.loads(DATA.read_text(encoding="utf-8"))
    for chapter in chapters:
        for question in chapter["questions"]:
            target = OUTPUT / f"{question['id']}.mp3"
            if target.exists() and target.stat().st_size > 0 and not args.force:
                continue
            source = question.get("source")
            if source:
                day = json.loads((ROOT / f"bootcamp-app/src/data/day{source['day']}.json").read_text(encoding="utf-8"))
                index = next(i for i, word in enumerate(day["vocab"]) if word["word"] == source["word"])
                existing = ROOT / f"bootcamp-app/public/audio/day{source['day']}/vocab_{index}_word.mp3"
                if existing.exists():
                    shutil.copyfile(existing, target)
                    print(f"Reused {question['id']}", flush=True)
                    continue
            temporary = target.with_suffix(".tmp")
            gTTS(text=question["chant"] + ".", lang="de", slow=False, timeout=(8, 20)).save(str(temporary))
            temporary.replace(target)
            print(f"Generated {question['id']}", flush=True)
    print(f"Ready: {len(list(OUTPUT.glob('*.mp3')))} vocal samples", flush=True)


if __name__ == "__main__":
    main()
