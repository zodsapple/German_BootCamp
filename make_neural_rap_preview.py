"""Create one 15-second neural-voice audition; leave the 200 live samples untouched."""

import asyncio
import json
from pathlib import Path
import subprocess
import wave

import edge_tts
import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parent
STEMS = ROOT / "artifacts/neural-rap-stems"
OUTPUT = ROOT / "bootcamp-app/public/audio/previews"
SR, SECONDS, BPM = 48000, 15, 96
BEAT = 60 / BPM
SAMPLES = [
    ("zug", "Mit dem Zug.", "de-DE-ConradNeural"),
    ("bahn", "Mit der Bahn.", "de-DE-ConradNeural"),
    ("kino", "Ins Kino.", "de-DE-ConradNeural"),
    ("den-tisch", "Auf den Tisch.", "de-DE-ConradNeural"),
    ("dem-tisch", "Auf dem Tisch.", "de-DE-ConradNeural"),
    ("dem", "dem.", "de-DE-KatjaNeural"),
    ("der", "der.", "de-DE-KatjaNeural"),
    ("den", "den.", "de-DE-KatjaNeural"),
]
RNG = np.random.default_rng(96)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


async def synthesize():
    semaphore = asyncio.Semaphore(3)

    async def sample(name, text, voice):
        audio, timing = STEMS / f"{name}.mp3", STEMS / f"{name}.jsonl"
        if audio.exists() and timing.exists() and audio.stat().st_size > 1000:
            return
        async with semaphore:
            for attempt in range(3):
                try:
                    speech = edge_tts.Communicate(text, voice, rate="+6%", pitch="-1Hz" if "Conrad" in voice else "+1Hz", boundary="WordBoundary", connect_timeout=12, receive_timeout=25)
                    await speech.save(str(audio), str(timing))
                    print(f"Synthesized {name}: {voice}", flush=True)
                    return
                except Exception:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(1 + attempt)

    await asyncio.gather(*(sample(*item) for item in SAMPLES))


def decode(name, directory=STEMS, emphasized=()):
    raw = subprocess.run([FFMPEG, "-v", "error", "-i", str(directory / f"{name}.mp3"), "-ar", str(SR), "-ac", "1", "-f", "f32le", "-"], check=True, capture_output=True).stdout
    audio = np.frombuffer(raw, dtype=np.float32).copy()
    active = np.flatnonzero(np.abs(audio) > 0.007)
    if not len(active):
        raise ValueError(f"Silent voice sample: {name}")
    first, last = max(0, active[0] - int(0.015 * SR)), min(len(audio), active[-1] + int(0.06 * SR))
    audio = audio[first:last]
    # Emphasize the case article inside an otherwise natural continuous phrase.
    envelope = np.ones(len(audio))
    stressed = {"dem", "der", "den", *(word.lower() for word in emphasized)}
    for line in (directory / f"{name}.jsonl").read_text(encoding="utf-8").splitlines():
        item = json.loads(line)
        if item.get("text", "").strip(". ,!?").lower() not in stressed:
            continue
        begin = max(0, int(item["offset"] / 10000000 * SR) - first)
        end = min(len(audio), int((item["offset"] + item["duration"]) / 10000000 * SR) - first)
        if end > begin:
            envelope[begin:end] += 0.5 * np.sin(np.linspace(0, np.pi, end - begin))
    audio *= envelope
    peak = max(0.05, float(np.max(np.abs(audio))))
    audio *= 0.78 / peak
    fade = min(int(0.008 * SR), len(audio) // 4)
    audio[:fade] *= np.linspace(0, 1, fade)
    audio[-fade:] *= np.linspace(1, 0, fade)
    return audio


def filtered_noise(seconds, low, high):
    noise = RNG.normal(0, 1, round(SR * seconds))
    spectrum = np.fft.rfft(noise)
    frequencies = np.fft.rfftfreq(len(noise), 1 / SR)
    spectrum *= (frequencies >= low) & (frequencies <= high)
    return np.fft.irfft(spectrum, len(noise))


def kick():
    t = np.arange(int(SR * 0.42)) / SR
    frequency = 43 + 105 * np.exp(-t * 29)
    phase = 2 * np.pi * np.cumsum(frequency) / SR
    return 0.95 * np.sin(phase) * np.exp(-t * 13) + 0.13 * RNG.normal(0, 1, len(t)) * np.exp(-t * 200)


def snare():
    t = np.arange(int(SR * 0.24)) / SR
    body = 0.24 * np.sin(2 * np.pi * 185 * t) * np.exp(-t * 30)
    crack = filtered_noise(0.24, 850, 10000) * np.exp(-t * 20) * 0.43
    for delay in (0.012, 0.025):
        start = int(delay * SR)
        crack[start:] += filtered_noise((len(t) - start) / SR, 1400, 7000) * np.exp(-(t[start:] - delay) * 55) * 0.14
    return body + crack


def hat(open_hat=False):
    duration = 0.13 if open_hat else 0.045
    t = np.arange(int(SR * duration)) / SR
    return filtered_noise(duration, 6500, 18000) * np.exp(-t * (28 if open_hat else 100)) * (0.1 if open_hat else 0.075)


def bass(frequency, duration):
    t = np.arange(int(SR * duration)) / SR
    tone = np.sin(2 * np.pi * frequency * t) + 0.2 * np.sin(4 * np.pi * frequency * t)
    attack = np.minimum(1, t / 0.008)
    return np.tanh(tone * 1.4) * attack * np.exp(-t * 6) * 0.22


def pluck(frequency, duration=0.4):
    t = np.arange(int(SR * duration)) / SR
    wave = sum(np.sin(2 * np.pi * frequency * harmonic * t) / harmonic**1.8 for harmonic in range(1, 5))
    return wave * np.minimum(1, t / 0.003) * np.exp(-t * 12) * 0.06


def add(track, signal, seconds, gain=1, pan=0):
    start = max(0, int(seconds * SR))
    length = min(len(signal), len(track) - start)
    if length <= 0:
        return
    left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    track[start:start + length, 0] += signal[:length] * gain * left
    track[start:start + length, 1] += signal[:length] * gain * right


def make_mix():
    drums = np.zeros((SR * SECONDS, 2), dtype=np.float32)
    music, voices = np.zeros_like(drums), np.zeros_like(drums)
    duck = np.ones(SR * SECONDS, dtype=np.float32)
    kick_sample, snare_sample = kick(), snare()
    for beat in range(24):
        when = beat * BEAT
        if beat % 2 == 0:
            add(drums, kick_sample, when, 0.95)
        else:
            add(drums, snare_sample, when, 1.05)
        add(drums, hat(), when, 1, -0.18)
        add(drums, hat(open_hat=beat % 4 == 3), when + BEAT * 0.55, 0.75, 0.22)
        if beat % 4 in {0, 2}:
            note = [55, 55, 65.406, 48.999, 55, 48.999][beat // 4]
            add(music, bass(note, 0.45), when + 0.008, 1)
        if beat % 4 == 1:
            for note in (220, 261.626, 329.628):
                add(music, pluck(note), when + 0.025, 0.6, -0.15)
        if beat in {7, 15, 23}:
            add(music, pluck(880, 0.3), when + BEAT / 2, 0.8, 0.35)
        if beat in {6, 14, 22}:
            add(drums, kick_sample, when + BEAT * 0.75, 0.45)

    decoded = {name: decode(name) for name, _, _ in SAMPLES}
    phrases = [("zug", "dem"), ("bahn", "der"), ("kino", None), ("den-tisch", "den"), ("dem-tisch", "dem")]
    for bar, (name, response) in enumerate(phrases):
        start = bar * BEAT * 4 + 0.08
        lead = decoded[name]
        add(voices, lead, start, 1.05)
        begin, end = int(start * SR), min(len(duck), int((start + len(lead) / SR + 0.09) * SR))
        duck[begin:end] = 0.42
        if response:
            # Clear call-and-response on beats three and four, with a quieter stereo echo.
            for offset, gain, pan in [(2, 0.57, -0.14), (3, 0.38, 0.16)]:
                add(voices, decoded[response], bar * 4 * BEAT + offset * BEAT + 0.025, gain, pan)
        else:
            add(voices, lead, bar * 4 * BEAT + 3 * BEAT, 0.3, 0.22)
    for index, name in enumerate(("den", "dem", "den", "dem")):
        add(voices, decoded[name], 12.5 + index * BEAT + 0.025, 0.9, -0.1 if index % 2 == 0 else 0.1)
    music_output = ROOT / "bootcamp-app/public/audio/music"
    music_output.mkdir(parents=True, exist_ok=True)
    for name, track in [("drums-96", drums * 0.85), ("music-96", music)]:
        subprocess.run([FFMPEG, "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "libmp3lame", "-b:a", "160k", str(music_output / f"{name}.mp3")], input=track.astype("<f4").tobytes(), check=True)
    # A short original impact: low sweep, sub tail and a sharp crack, without a vocal interruption.
    t = np.arange(round(SR * 0.32)) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 125 * np.exp(-t * 35)) / SR) * np.exp(-t * 13)
    boom += filtered_noise(0.32, 1000, 11000) * np.exp(-t * 65) * 0.55
    boom *= 0.85 / np.max(np.abs(boom))
    subprocess.run([FFMPEG, "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "libmp3lame", "-b:a", "160k", str(music_output / "bomb-hit.mp3")], input=boom.astype("<f4").tobytes(), check=True)
    # A short gain ramp avoids clicks where the instrumental ducks under the lead voice.
    duck = np.convolve(duck, np.ones(961) / 961, mode="same")
    mix = drums * 0.85 + music * duck[:, None] + voices * 0.95
    mix[-int(SR * 0.04):] *= np.linspace(1, 0, int(SR * 0.04))[:, None]
    pcm = mix * min(0.85, 0.98 / max(0.01, float(np.max(np.abs(mix)))))
    master = STEMS / "audition-master.wav"
    with wave.open(str(master), "wb") as audio:
        audio.setparams((2, 2, SR, 0, "NONE", "not compressed"))
        audio.writeframes((pcm * 32767).astype("<i2").tobytes())
    for extension, codec in [("mp3", ["-c:a", "libmp3lame", "-b:a", "192k"]), ("m4a", ["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"])]:
        target = OUTPUT / f"neural-rap-15s.{extension}"
        subprocess.run([FFMPEG, "-y", "-v", "error", "-i", str(master), "-af", "acompressor=threshold=0.18:ratio=2:attack=5:release=80,loudnorm=I=-14:TP=-1:LRA=8", "-ar", str(SR), "-t", str(SECONDS), *codec, str(target)], check=True)
        print(f"Saved {target.name}: {target.stat().st_size:,} bytes", flush=True)
    report = {"duration": SECONDS, "bpm": BPM, "lead": "de-DE-ConradNeural", "response": "de-DE-KatjaNeural", "provider": "Microsoft Edge online neural TTS via edge-tts", "phrases": [text for _, text, _ in SAMPLES[:5]], "status": "approved voice and rhythm reference"}
    (OUTPUT / "neural-rap-15s.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    STEMS.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    asyncio.run(synthesize())
    make_mix()
