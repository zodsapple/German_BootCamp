"""Render the seven original, eight-bar battle backings. No samples or APIs required."""

from pathlib import Path
import subprocess

import imageio_ffmpeg
import numpy as np


OUTPUT = Path(__file__).resolve().parent / "bootcamp-app/public/audio/music"
SR, BPM, BARS = 48000, 96, 8
STEP = 60 / BPM / 4
SAMPLES = round(SR * STEP * 16 * BARS)
TAU = 2 * np.pi

# Positions in sixteenths. Bass: (position, semitone from root, duration in steps).
# Hooks sit above the bass, in a different register for each arrangement.
BACKINGS = {
    "breakbeat": dict(
        kicks=[0, 3, 8, 10, 14], snares=[4, 12], ghosts=[7, 15], hats=[0, 2, 4, 6, 8, 10, 12, 14],
        roots=[43, 43, 46, 41], bass=[(0, 0, 3), (3, 0, 2), (8, 12, 2), (11, 7, 2), (14, 0, 2)],
        hook=[(2, (7, 15)), (6, (10, 17)), (10, (7, 15)), (14, (3, 10))],
        voice="keys", register=12, drum_pitch=54, swing=0.22,
    ),
    "trap": dict(
        kicks=[0, 5, 10, 14], snares=[8], ghosts=[13], hats=[0, 2, 4, 6, 6.67, 7.33, 8, 10, 12, 14, 15, 15.5],
        roots=[41, 41, 37, 39], bass=[(0, 0, 4), (5, 0, 4), (10, 12, 3), (14, 0, 2)],
        hook=[(0, (0, 7)), (5, (3,)), (9, (7,)), (12, (10,)), (15, (7,))],
        voice="bell", register=24, drum_pitch=45, swing=0,
    ),
    "funk": dict(
        kicks=[0, 3, 7, 10, 13], snares=[4, 12], ghosts=[6, 15], hats=list(range(16)),
        roots=[40, 40, 45, 43], bass=[(0, 0, 2), (3, 12, 1), (5, 7, 2), (8, 0, 2), (10, 10, 1), (12, 7, 1), (15, 12, 1)],
        hook=[(1, (3, 10, 14)), (6, (3, 10, 14)), (9, (7, 12)), (13, (3, 10, 14))],
        voice="chop", register=24, drum_pitch=61, swing=0.12,
    ),
    "latin": dict(
        kicks=[0, 6, 10, 14], snares=[4, 12], ghosts=[3, 7, 11], hats=[0, 2, 4, 6, 8, 10, 12, 14, 15],
        roots=[45, 43, 41, 40], bass=[(0, 0, 3), (6, 7, 2), (10, 12, 3), (14, 7, 2)],
        hook=[(0, (0,)), (3, (7,)), (6, (12,)), (8, (15,)), (11, (12,)), (14, (7,))],
        voice="mallet", register=24, drum_pitch=56, swing=0,
    ),
    "synthwave": dict(
        kicks=[0, 4, 8, 11, 14], snares=[4, 12], ghosts=[15], hats=[2, 6, 10, 14],
        roots=[45, 41, 48, 43], bass=[(0, 0, 2), (2, 12, 2), (4, 0, 2), (6, 12, 2), (8, 0, 2), (10, 12, 2), (12, 0, 2), (14, 7, 2)],
        hook=[(1, (7,)), (3, (12,)), (5, (15,)), (7, (19,)), (9, (15,)), (11, (12,)), (13, (10,)), (15, (7,))],
        voice="synth", register=12, drum_pitch=48, swing=0,
    ),
    "house": dict(
        kicks=[0, 4, 8, 12], snares=[4, 12], ghosts=[15], hats=[2, 6, 10, 14],
        roots=[42, 42, 45, 40], bass=[(2, 0, 2), (6, 0, 2), (10, 7, 2), (14, 12, 2)],
        hook=[(2, (3, 7, 10)), (7, (3, 7, 14)), (10, (3, 7, 10)), (14, (7, 12))],
        voice="organ", register=24, drum_pitch=51, swing=0.10,
    ),
    "double-time": dict(
        kicks=[0, 3, 7, 8, 13], snares=[2, 6, 10, 14], ghosts=[5, 11, 15], hats=list(range(16)),
        roots=[39, 39, 42, 37], bass=[(0, 0, 3), (4, 0, 3), (8, 12, 2), (11, 7, 3), (15, 0, 1)],
        hook=[(1, (7, 14)), (5, (10, 15)), (9, (7, 14)), (13, (12, 19))],
        voice="pulse", register=12, drum_pitch=57, swing=0.06,
    ),
}


def time(seconds):
    return np.arange(round(SR * seconds)) / SR


def pitch(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def envelope(t, decay, attack=0.005):
    return np.minimum(t / attack, 1) * np.exp(-decay * t) * np.minimum((len(t) / SR - t) / 0.012, 1)


def noise(t, rng, low, high):
    wave = rng.standard_normal(len(t))
    spectrum = np.fft.rfft(wave)
    hz = np.fft.rfftfreq(len(t), 1 / SR)
    spectrum[(hz < low) | (hz > high)] = 0
    return np.fft.irfft(spectrum, len(t))


def drum_kit(config, rng):
    t = time(0.29)
    kick = np.sin(TAU * np.cumsum(config["drum_pitch"] + 110 * np.exp(-39 * t)) / SR) * envelope(t, 14, 0.001)
    kick += noise(t, rng, 1200, 7500) * envelope(t, 125) * 0.24
    t = time(0.19)
    slap = noise(t, rng, 850, 10000)
    if config["voice"] in ("organ", "bell", "synth"):
        slap += np.roll(slap, round(0.013 * SR)) * 0.5  # Clap layer.
    snare = (0.23 * np.sin(TAU * (165 + config["drum_pitch"] / 2) * t) + 0.64 * slap) * envelope(t, 24, 0.002)
    t = time(0.132)
    hats = noise(t, rng, 5700, 15500)
    t_perc = time(0.115)
    percussion = np.sin(TAU * np.cumsum(215 + 185 * np.exp(-65 * t_perc)) / SR) * envelope(t_perc, 32)
    return kick, snare, hats * envelope(t, 88, 0.0015), hats * envelope(t, 31, 0.0015), percussion


def bass_note(midi, steps, voice):
    t = time(steps * STEP)
    x = TAU * pitch(midi) * t
    grit = 0.65 if voice in ("pulse", "chop", "synth") else 0.27
    tone = np.sin(x) + grit * np.sin(2 * x) + 0.13 * np.sin(3 * x)
    decay = 1.8 if voice in ("bell", "pulse") else 5.3
    return np.tanh(tone) * envelope(t, decay, 0.011)


def hook_note(midi, voice):
    durations = {"keys": (0.34, 8), "bell": (0.53, 6), "chop": (0.12, 16), "mallet": (0.33, 10),
                 "synth": (0.31, 5), "organ": (0.22, 7), "pulse": (0.27, 7)}
    duration, decay = durations[voice]
    t = time(duration)
    x = TAU * pitch(midi) * t
    if voice in ("bell", "mallet"):
        wave = np.sin(x + (1.1 if voice == "bell" else 0.45) * np.sin(x * 2) * np.exp(-15 * t))
        wave += 0.16 * np.sin((3.51 if voice == "bell" else 4) * x) * np.exp(-22 * t)
    elif voice in ("synth", "pulse"):
        wave = sum(np.sin(x * h) / h for h in range(1, 7)) * 0.68
        wave += 0.30 * np.sin(1.006 * x)
    elif voice == "organ":
        wave = (np.sin(x) + 0.55 * np.sin(2 * x) + 0.20 * np.sin(3 * x)) * (0.85 + 0.15 * np.sin(TAU * 7 * t))
    else:
        wave = np.sin(x) + 0.42 * np.sin(2 * x) + 0.33 * np.sin(3 * x) * np.exp(-16 * t)
    return wave * envelope(t, decay, 0.009 if voice == "synth" else 0.004)


def add(track, signal, step, gain=1, pan=0):
    begin = round(step * STEP * SR) % len(track)
    angle = (pan + 1) * np.pi / 4
    stereo = signal[:, None] * np.array([np.cos(angle), np.sin(angle)]) * gain
    count = min(len(stereo), len(track) - begin)
    track[begin:begin + count] += stereo[:count]
    track[:len(stereo) - count] += stereo[count:]


def render(config, seed):
    rng = np.random.default_rng(seed)
    drums = np.zeros((SAMPLES, 2), dtype=np.float32)
    music = np.zeros_like(drums)
    kick, snare, closed, opened, perc = drum_kit(config, rng)
    voice = config["voice"]
    for bar in range(BARS):
        root = config["roots"][bar % 4]

        def position(step):
            return 16 * bar + step + (config["swing"] if step % 2 == 1 else 0)

        for step in config["kicks"]:
            add(drums, kick, position(step), 0.88 if step % 4 == 0 else 0.71)
        for step in config["snares"]:
            add(drums, snare, position(step), 0.96)
        for step in config["ghosts"]:
            add(drums, perc if voice == "mallet" else snare, position(step), 0.48 if voice == "mallet" else 0.23, 0.30)
        for index, step in enumerate(config["hats"]):
            use_open = step in (6, 14) and (voice in ("organ", "synth") or bar % 2)
            add(drums, opened if use_open else closed, position(step), 0.32 if index % 2 == 0 else 0.18, (-1) ** index * 0.26)
        if bar % 4 == 3:
            for step in (14.5, 15.25, 15.75):
                add(drums, perc if voice == "mallet" else snare, position(step), 0.31 if voice == "mallet" else 0.22, -0.22)
        for step, offset, length in config["bass"]:
            add(music, bass_note(root + offset, length, voice), position(step) + 0.035, 0.29)
        for i, (step, chord) in enumerate(config["hook"]):
            for semitones in chord:
                midi = root + config["register"] + semitones
                lead = hook_note(midi, voice)
                gain = (0.14 if bar >= 4 else 0.12) / np.sqrt(len(chord))
                pan = (-1) ** i * 0.35
                add(music, lead, position(step), gain, pan)
                if voice in ("bell", "synth", "mallet"):
                    add(music, lead, position(step) + 3, gain * 0.24, -pan)
        if bar >= 4 and bar % 2:
            add(music, hook_note(root + config["register"] + 19, voice), position(15), 0.09, 0.38)
    drums = np.tanh(drums * 1.16) * 0.93
    music = np.tanh(music * 0.74)
    # Match loudness across loops and leave room for vocals and the impact cue.
    mix = drums + music
    gain = min(0.10 / np.sqrt(np.mean(mix**2)), 0.80 / np.max(np.abs(mix)))
    return drums * gain, music * gain


def encode(path, track):
    subprocess.run([
        imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2",
        "-i", "-", "-c:a", "libmp3lame", "-b:a", "112k", str(path),
    ], input=track.astype("<f4").tobytes(), check=True)


if __name__ == "__main__":
    for seed, (name, config) in enumerate(BACKINGS.items(), start=1):
        drums, music = render(config, seed)
        encode(OUTPUT / f"{name}-drums.mp3", drums)
        encode(OUTPUT / f"{name}-music.mp3", music)
        print(f"{name}: {BARS} bars at {BPM} BPM")
