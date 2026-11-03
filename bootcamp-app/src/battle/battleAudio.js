import { BEAT_SECONDS, FEEDBACK_SECONDS } from './battleEngine.js';

// One audio clock keeps the beat, voices and combat cues together on mobile.
export class BattleAudio {
    constructor() {
        this.context = null;
        this.buffers = new Map();
        this.nodes = new Set();
        this.timer = null;
        this.origin = 0;
        this.muted = false;
        this.clockMode = 'performance';
    }

    async unlock() {
        try {
            if (navigator.audioSession) {
                this.previousSessionType ??= navigator.audioSession.type;
                navigator.audioSession.type = 'playback';
            }
        } catch { /* Optional Safari Audio Session API; Web Audio still works without it. */ }
        if (!this.context) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) throw new Error('浏览器暂不支持战斗音频，可以选择静音开战。');
            this.context = new AudioContext();
            this.master = this.context.createGain();
            this.master.gain.value = this.muted ? 0 : 0.72;
            const compressor = this.context.createDynamicsCompressor();
            this.master.connect(compressor);
            compressor.connect(this.context.destination);
            this.music = this.context.createGain();
            this.music.gain.value = 0.55;
            this.music.connect(this.master);
            this.voices = this.context.createGain();
            this.voices.gain.value = 1;
            this.voices.connect(this.master);
            this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
            const data = this.noise.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        }
        // Called directly by Start / Resume, before fetching any assets.
        await this.context.resume();
        if (this.context.state !== 'running') throw new Error('声音尚未启动，请再点一次开战，或选择静音开战。');
    }

    now() {
        return this.clockMode === 'audio' ? this.context.currentTime : performance.now() / 1000;
    }

    setMuted(muted) {
        this.muted = muted;
        if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.72, this.context.currentTime, 0.03);
    }

    async preload(questions, onProgress = () => {}) {
        let loaded = 0;
        await Promise.all(questions.map(async question => {
            if (!this.buffers.has(question.id)) {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 12000);
                try {
                    const response = await fetch(`${import.meta.env.BASE_URL}audio/battle/${question.id}.mp3`, { signal: controller.signal });
                    if (!response.ok) throw new Error(`语音加载失败：${question.chant}`);
                    const decoded = await this.context.decodeAudioData(await response.arrayBuffer());
                    this.buffers.set(question.id, this.trimSilence(decoded));
                } finally {
                    clearTimeout(timeout);
                }
            }
            onProgress(++loaded, questions.length);
        }));
    }

    trimSilence(buffer) {
        const data = buffer.getChannelData(0);
        let first = 0;
        let last = data.length - 1;
        while (first < last && Math.abs(data[first]) < 0.008) first++;
        while (last > first && Math.abs(data[last]) < 0.008) last--;
        first = Math.max(0, first - Math.floor(buffer.sampleRate * 0.025));
        last = Math.min(data.length, last + Math.floor(buffer.sampleRate * 0.08));
        if (last <= first) return buffer;
        const trimmed = this.context.createBuffer(buffer.numberOfChannels, last - first, buffer.sampleRate);
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            trimmed.copyToChannel(buffer.getChannelData(channel).subarray(first, last), channel);
        }
        return trimmed;
    }

    track(node, connected = []) {
        this.nodes.add(node);
        node.onended = () => {
            this.nodes.delete(node);
            node.disconnect();
            connected.forEach(connection => connection.disconnect());
        };
        return node;
    }

    tone(frequency, when, duration, volume, type = 'sine', destination = this.music, endFrequency) {
        if (!this.context || this.context.state !== 'running') return;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, when);
        if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, when + duration);
        gain.gain.setValueAtTime(0.001, when);
        gain.gain.linearRampToValueAtTime(volume, when + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
        oscillator.connect(gain);
        gain.connect(destination);
        this.track(oscillator, [gain]);
        oscillator.start(when);
        oscillator.stop(when + duration + 0.01);
    }

    hiss(when, duration, volume, highpass = 6000, destination = this.music) {
        if (!this.context || this.context.state !== 'running') return;
        const source = this.context.createBufferSource();
        const filter = this.context.createBiquadFilter();
        const gain = this.context.createGain();
        source.buffer = this.noise;
        filter.type = 'highpass';
        filter.frequency.value = highpass;
        gain.gain.setValueAtTime(volume, when);
        gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(destination);
        this.track(source, [filter, gain]);
        source.start(when);
        source.stop(when + duration);
    }

    scheduleBeat(beat, when) {
        const step = beat % 16;
        if (beat % 2 === 0) this.tone(150, when, 0.22, 0.8, 'sine', this.music, 42);
        if (beat % 2 === 1) {
            this.hiss(when, 0.13, 0.22, 1500);
            this.tone(180, when, 0.07, 0.16, 'triangle');
        }
        this.hiss(when, 0.045, beat % 2 ? 0.07 : 0.12);
        this.hiss(when + BEAT_SECONDS / 2, 0.035, 0.045);
        if (beat % 2 === 0) {
            const bass = [55, 55, 65.41, 49][Math.floor(step / 4)];
            this.tone(bass, when, 0.25, 0.24, 'triangle');
        }
        if (beat % 4 === 1) {
            const note = [440, 523.25, 392, 329.63][Math.floor(step / 4)];
            this.tone(note, when, 0.12, 0.08, 'triangle');
            this.tone(note * 2, when + BEAT_SECONDS / 2, 0.08, 0.035);
        }
    }

    start() {
        this.stop();
        this.clockMode = this.context?.state === 'running' ? 'audio' : 'performance';
        this.origin = this.now() + 0.12;
        if (!this.context || this.context.state !== 'running') return this.origin;
        this.music.gain.cancelScheduledValues(this.context.currentTime);
        this.music.gain.value = 0.55;
        let beat = 0;
        const schedule = () => {
            while (this.origin + beat * BEAT_SECONDS < this.context.currentTime + 0.16) {
                this.scheduleBeat(beat, this.origin + beat * BEAT_SECONDS);
                beat++;
            }
        };
        schedule();
        this.timer = setInterval(schedule, 25);
        return this.origin;
    }

    nextBeat(time = this.now()) {
        return this.origin + Math.ceil(Math.max(0, time - this.origin) / BEAT_SECONDS) * BEAT_SECONDS;
    }

    feedbackEnd(id) {
        const duration = this.buffers.get(id)?.duration || 1.5;
        const echo = duration < 1.15 ? BEAT_SECONDS * 2 : 0;
        const voiceEnd = this.nextBeat(this.now() + 0.06) + duration + echo + 0.18;
        const earliest = Math.max(this.now() + FEEDBACK_SECONDS, voiceEnd);
        return this.origin + Math.ceil((earliest - this.origin) / (BEAT_SECONDS * 4)) * BEAT_SECONDS * 4;
    }

    speak(id, when = this.context?.currentTime || 0, volume = 1) {
        const buffer = this.buffers.get(id);
        if (!buffer || !this.context || this.context.state !== 'running') return;
        const source = this.context.createBufferSource();
        const gain = this.context.createGain();
        source.buffer = buffer;
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(this.voices);
        this.track(source, [gain]);
        source.start(when);
    }

    respond(question, correct, combo) {
        if (!this.context || this.context.state !== 'running') return;
        const now = this.context.currentTime;
        if (correct) {
            this.tone(combo >= 3 ? 110 : 82, now, 0.15, 0.8, 'sine', this.master, 35);
            this.hiss(now, 0.09, 0.3, 1800, this.master);
            [523.25, 659.25, combo >= 3 ? 1046.5 : 783.99].forEach((note, i) => this.tone(note, now + 0.04 + i * 0.055, 0.16, 0.13, 'triangle', this.master));
        } else {
            this.tone(130, now, 0.23, 0.45, 'sawtooth', this.master, 45);
            this.hiss(now, 0.16, 0.25, 800, this.master);
        }
        const when = this.nextBeat(now + 0.06);
        const duration = this.buffers.get(question.id)?.duration || 1.5;
        this.music.gain.cancelScheduledValues(now);
        this.music.gain.setTargetAtTime(0.18, now, 0.025);
        this.music.gain.setTargetAtTime(0.55, when + duration + 0.12, 0.08);
        this.speak(question.id, when);
        // Short samples get a quieter call-and-response echo exactly two beats later.
        if (duration < 1.15) this.speak(question.id, when + BEAT_SECONDS * 2, 0.42);
    }

    stop() {
        clearInterval(this.timer);
        this.timer = null;
        for (const node of this.nodes) {
            try { node.stop(); } catch { /* A finished one-shot may already be stopped. */ }
        }
        this.nodes.clear();
    }

    async close() {
        this.stop();
        const context = this.context;
        this.context = null;
        if (context && context.state !== 'closed') await context.close();
        try {
            if (navigator.audioSession?.type === 'playback' && this.previousSessionType !== undefined) navigator.audioSession.type = this.previousSessionType;
        } catch { /* The browser owns the audio session when this API is unavailable. */ }
    }
}
