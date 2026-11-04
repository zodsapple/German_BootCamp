"""Encode timestamped browser captures and the game's own audio as a 15s MP4."""

import argparse
import json
from pathlib import Path
import shutil
import subprocess

import imageio_ffmpeg
from PIL import Image

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audio", type=Path, default=ROOT / "artifacts/promo-audio.webm")
    args = parser.parse_args()
    frames_dir = ROOT / "artifacts/promo-frames"
    metadata = json.loads((frames_dir / "metadata.json").read_text(encoding="utf-8"))
    frames = metadata["frames"]
    first = frames[0]["time"]
    lines = ["ffconcat version 1.0"]
    for index, frame in enumerate(frames):
        normalized = f"normalized-{index:04d}.png"
        with Image.open(frames_dir / frame["file"]) as image:
            image.convert("RGB").resize((540, 960), Image.Resampling.LANCZOS).save(frames_dir / normalized)
        end = frames[index + 1]["time"] - first if index + 1 < len(frames) else 15
        duration = max(0.001, end - (frame["time"] - first))
        lines.extend([f"file '{normalized}'", f"duration {duration:.6f}"])
    lines.append(f"file 'normalized-{len(frames) - 1:04d}.png'")
    concat = frames_dir / "frames.ffconcat"
    concat.write_text("\n".join(lines) + "\n", encoding="utf-8")
    output = ROOT / "artifacts/palace-duel-15s.mp4"
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run([
        ffmpeg, "-y", "-hide_banner", "-loglevel", "warning",
        "-f", "concat", "-safe", "0", "-i", str(concat),
        "-ss", f"{max(0, first):.3f}", "-i", str(args.audio),
        "-t", "15", "-map", "0:v:0", "-map", "1:a:0",
        "-vf", "scale=720:1280:flags=lanczos:in_range=pc:out_range=tv,fps=30:start_time=0,format=yuv420p",
        "-af", "alimiter=limit=0.95,apad",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", "30", "-fps_mode", "cfr", "-color_range", "tv",
        "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
        "-metadata", "title=Deutsch Palace Duel - 15 second gameplay",
        str(output),
    ], check=True)
    public = ROOT / "bootcamp-app/public/media"
    public.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(output, public / output.name)
    print(f"Saved {output} ({output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
