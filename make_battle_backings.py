"""Render the 120 BPM acoustic battle loops and lobby audition.

Instrument recordings: Versilian Community Sample Library (CC0), by Versilian
Studios and contributors. https://github.com/sgossner/VCSL
Only the finished mixes ship. The source WAVs are cached under artifacts/.
"""

from functools import lru_cache
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen
import math
import subprocess

import imageio_ffmpeg
import numpy as np


ROOT = Path(__file__).resolve().parent
AUDIO = ROOT / "bootcamp-app/public/audio"
CACHE = ROOT / "artifacts/acoustic-samples"
SOURCE = "https://raw.githubusercontent.com/sgossner/VCSL/c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e/"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SR, BPM, BARS = 48000, 120, 8
BEAT = 60 / BPM
STEP = BEAT / 4
SAMPLES = round(SR * STEP * 16 * BARS)

PIANO = "Chordophones/Zithers/Upright Piano, Knight/Sustains/Player_vl2_rr1_{}.wav"
HARP = "Chordophones/Composite Chordophones/Folk Harp/EWHarp_Normal_{}_v2_RR1.wav"
STRINGS = "Chordophones/Composite Chordophones/Strumstick/Finger/Strumstick_Finger_Str{}_Main_{}_vl2_rr1.wav"
MALLETS = "Idiophones/Struck Idiophones/Marimba/Marimba_hit_Outrigger_{}_med_01.wav"
KALIMBA = "Idiophones/Plucked Idiophones/Kalimba, Kenya/Mbira6_Normal_MainSpirit_{}_vl3_rr2.wav"
IDI = "Idiophones/Struck Idiophones/"
MEM = "Membranophones/Struck Membranophones/"
# VCSL names middle C "C3". Keys here are MIDI note numbers.
TONES = {
    "piano": {midi: PIANO.format(note) for midi, note in [(31, "G0"), (43, "G1"), (55, "G2"), (67, "G3"), (79, "G4")]},
    "harp": {midi: HARP.format(note) for midi, note in [(36, "C1"), (48, "C2"), (60, "C3"), (72, "C4"), (84, "C5")]},
    "strings": {midi: STRINGS.format(string, note) for midi, string, note in
                [(50, 1, "D2"), (57, 2, "A2"), (62, 2, "D3"), (69, 3, "A3"), (74, 3, "D4"), (81, 3, "A4")]},
    "marimba": {midi: MALLETS.format(note) for midi, note in [(65, "F3"), (72, "C4"), (83, "B4"), (89, "F5")]},
    "kalimba": {midi: KALIMBA.format(note) for midi, note in [(71, "B3_k3"), (73, "C#4_k2"), (81, "A4_k1")]},
}
PERCUSSION = {
    "cajon-low": IDI + "Cajon/Cajon_hit1_f_rr1.wav",
    "cajon-tap": IDI + "Cajon/Cajon_hit2_f_rr2.wav",
    "shaker-down": IDI + "Shaker, Small/Mid_ShakerLowFaster_Down_rr1.wav",
    "shaker-up": IDI + "Shaker, Small/Mid_ShakerLowFaster_Up_rr2.wav",
    "claves": IDI + "Claves/Claves2_Hit_v2_rr1_Mid.wav",
    "clap": IDI + "Claps/SoloClap_vl2.wav",
    "bongo-low": MEM + "Bongos/BongoL_Hit1_v2_rr1_Mid.wav",
    "bongo-high": MEM + "Bongos/BongoH_Hit1_v2_rr2_Mid.wav",
}

# Each bar has 16 subdivisions. A chord is (bass MIDI note, minor flag).
# Melody figures use indices into the current triad across two octaves.
BACKINGS = {
    "piano-swing": dict(
        lead="piano", bass="harp", swing=0.26, chords=[(43, False), (40, True), (45, True), (38, False)],
        bass_steps=[0, 4, 8, 12], phrase=[(0, (1, 2)), (3, (3,)), (6, (2,)), (10, (1, 3)), (13, (2,))],
        low=[0, 7, 10], taps=[4, 12], accent="claves", accents=[3, 11, 15],
    ),
    "porch-folk": dict(
        lead="strings", bass="harp", swing=0.03, chords=[(38, False), (43, False), (47, True), (45, False)],
        bass_steps=[0, 8], phrase=[(0, (0, 1, 2)), (2, (2,)), (5, (1, 2)), (8, (3,)), (10, (1, 2)), (14, (1, 3))],
        low=[0, 8, 14], taps=[4, 12], accent="clap", accents=[6, 14],
    ),
    "bossa": dict(
        lead="strings", bass="harp", swing=0.05, chords=[(45, True), (38, True), (43, False), (36, False)],
        bass_steps=[0, 6, 8, 14], phrase=[(1, (1, 2)), (4, (2, 3)), (7, (1, 2)), (10, (1, 3)), (14, (1, 2))],
        low=[0, 6, 10], taps=[4, 12], accent="bongo-high", accents=[3, 7, 11, 13, 15],
    ),
    "marimba-run": dict(
        lead="marimba", bass="piano", swing=0, chords=[(41, False), (38, True), (46, False), (48, False)],
        bass_steps=[0, 6, 8, 13], phrase=[(0, (0,)), (2, (2,)), (4, (3,)), (6, (4,)), (9, (3,)), (11, (2,)), (14, (1,))],
        low=[0, 3, 8, 13], taps=[4, 12], accent="bongo-low", accents=[2, 6, 10, 15],
    ),
    "handclap-pop": dict(
        lead="piano", bass="strings", swing=0.02, chords=[(48, False), (43, False), (45, True), (41, False)],
        bass_steps=[0, 3, 8, 11, 14], phrase=[(0, (1, 2, 3)), (6, (1, 2)), (8, (2, 3)), (11, (4,)), (14, (1, 2))],
        low=[0, 3, 8, 11], taps=[4, 12], accent="clap", accents=[4, 12, 14],
    ),
    "harp-dance": dict(
        lead="harp", bass="piano", swing=0, chords=[(45, True), (41, False), (48, False), (43, False)],
        bass_steps=[0, 4, 8, 13], phrase=[(0, (1,)), (2, (2,)), (4, (3,)), (6, (4,)), (8, (2,)), (10, (3,)), (13, (4,)), (15, (5,))],
        low=[0, 6, 8, 14], taps=[4, 12], accent="claves", accents=[2, 7, 10, 15],
    ),
    "woodblock-rag": dict(
        lead="piano", bass="piano", swing=0.20, chords=[(41, False), (46, False), (43, True), (48, False)],
        bass_steps=[0, 4, 8, 12], phrase=[(1, (1, 2)), (4, (2, 4)), (7, (3,)), (9, (1, 2)), (12, (2, 3)), (15, (2,))],
        low=[0, 6, 8, 11], taps=[4, 12], accent="claves", accents=[1, 5, 7, 9, 13, 15],
    ),
    "kalimba-groove": dict(
        lead="kalimba", bass="harp", swing=0.08, chords=[(47, True), (43, False), (38, False), (45, False)],
        bass_steps=[0, 5, 8, 12], phrase=[(0, (2,)), (3, (3,)), (5, (4,)), (8, (2,)), (10, (4,)), (13, (3,)), (15, (2,))],
        low=[0, 5, 8, 11, 14], taps=[4, 12], accent="bongo-high", accents=[2, 6, 10, 14],
    ),
}


def decode(path):
    raw = subprocess.run([FFMPEG, "-v", "error", "-i", str(path), "-ar", str(SR), "-ac", "1", "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    signal = np.frombuffer(raw, dtype="<f4").copy()
    peak = float(np.max(np.abs(signal)))
    start = max(0, np.flatnonzero(np.abs(signal) > peak * 0.017)[0] - round(SR * 0.002))
    return signal[start:] / peak


@lru_cache(maxsize=None)
def recording(source):
    path = CACHE / Path(source).name
    if not path.exists():
        print(f"Fetching {path.name}", flush=True)
        with urlopen(SOURCE + quote(source), timeout=25) as response:
            path.write_bytes(response.read())
    return decode(path)


@lru_cache(maxsize=None)
def note(instrument, midi, seconds):
    bank = TONES[instrument]
    closest = min(bank, key=lambda key: abs(key - midi))
    source = recording(bank[closest])
    rate = 2 ** ((midi - closest) / 12)
    samples = min(round(seconds * SR), int(len(source) / rate))
    signal = np.interp(rate * np.arange(samples), np.arange(len(source)), source)
    return release(signal, 0.052)


def release(signal, seconds):
    signal = signal.copy()
    fade = min(len(signal), round(SR * seconds))
    signal[-fade:] *= np.linspace(1, 0, fade)
    return signal


def place(track, signal, seconds, gain, pan=0):
    begin = round(seconds * SR) % len(track)
    stereo = signal[:, None] * np.sqrt([(1 - pan) / 2, (1 + pan) / 2]) * gain
    count = min(len(stereo), len(track) - begin)
    track[begin:begin + count] += stereo[:count]
    track[:len(stereo) - count] += stereo[count:]


def render(config, seed):
    rng = np.random.default_rng(seed)
    percussion = {name: release(recording(path)[:round(SR * 0.24)], 0.028) for name, path in PERCUSSION.items()}
    drums = np.zeros((SAMPLES, 2), dtype=np.float32)
    music = np.zeros_like(drums)
    for bar in range(BARS):
        root, minor = config["chords"][bar % 4]
        chord = (0, 3 if minor else 4, 7, 12, 15 if minor else 16, 19)

        def position(step):
            swing = config["swing"] if step % 2 == 1 else 0
            return (16 * bar + step + swing) * STEP

        for step in config["low"]:
            place(drums, percussion["cajon-low"], position(step), 0.40 if step % 4 == 0 else 0.30)
        for step in config["taps"]:
            place(drums, percussion["cajon-tap"], position(step) + 0.003, 0.29, 0.08)
        for i, step in enumerate(range(0, 16, 2)):
            up = i % 2
            sample = percussion["shaker-up" if up else "shaker-down"]
            place(drums, sample, position(step) + rng.uniform(0, 0.007), 0.13 if up else 0.085, -0.35)
        for step in config["accents"]:
            place(drums, percussion[config["accent"]], position(step), 0.16, 0.33)
        if bar % 4 == 3:
            place(drums, percussion["cajon-tap"], position(15), 0.14, 0.2)

        for i, step in enumerate(config["bass_steps"]):
            bass_midi = root if i % 2 == 0 else root - 5
            if config["bass"] == "strings":
                bass_midi += 12
            place(music, note(config["bass"], bass_midi, 0.27), position(step), 0.21 if i == 0 else 0.16)
        lead = config["lead"]
        register = 12 if root >= 46 else 24
        for i, (step, degrees) in enumerate(config["phrase"]):
            if len(degrees) == 1 and bar % 4 in (1, 3) and i == len(config["phrase"]) - 1:
                degrees = (0 if bar % 4 == 3 else 2,)
            for index, degree in enumerate(degrees):
                midi = root + register + chord[degree]
                duration = 0.23 if len(degrees) > 1 else 0.32
                gain = rng.uniform(0.15, 0.21) / math.sqrt(len(degrees))
                strum = index * (0.013 if lead == "strings" else 0.003)
                place(music, note(lead, midi, duration), position(step) + strum, gain, 0.15)

    mix = drums + music
    gain = min(0.069 / np.sqrt(np.mean(mix**2)), 0.74 / np.max(np.abs(mix)))
    return drums * gain, music * gain


def encode(path, track, bitrate="112k"):
    subprocess.run([FFMPEG, "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "libmp3lame", "-b:a", bitrate, str(path)], input=track.astype("<f4").tobytes(), check=True)


def preview(drums, music):
    voices = np.zeros_like(drums)
    for i, question in enumerate(("prep-zug", "prep-bahn", "prep-kino", "prep-fahrrad", "prep-schule")):
        lead = release(decode(AUDIO / "battle" / f"{question}.mp3"), 0.025)
        answer = release(decode(AUDIO / "echoes" / f"{question}.mp3"), 0.025)
        start = i * BEAT * 6
        echo = max(2, math.ceil((len(lead) / SR + 0.12) / BEAT)) * BEAT
        place(voices, lead, start + 0.025, 0.69)
        place(voices, answer, start + echo + 0.025, 0.50, 0.13)
    mix = (drums * 0.84 + music * 0.50 + voices)[:15 * SR].copy()
    mix[-int(0.15 * SR):] *= np.linspace(1, 0, int(0.15 * SR))[:, None]
    mix *= min(1, 0.88 / np.max(np.abs(mix)))
    encode(AUDIO / "previews/acoustic-rap-15s.mp3", mix, "160k")


if __name__ == "__main__":
    CACHE.mkdir(parents=True, exist_ok=True)
    output = AUDIO / "music/acoustic"
    output.mkdir(parents=True, exist_ok=True)
    for seed, (name, config) in enumerate(BACKINGS.items(), start=1):
        drums, music = render(config, seed)
        encode(output / f"{name}-drums.mp3", drums)
        encode(output / f"{name}-music.mp3", music)
        if name == "piano-swing":
            preview(drums, music)
        print(f"{name}: {BARS} bars at {BPM} BPM", flush=True)
