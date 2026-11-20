import { BEAT_SECONDS, FEEDBACK_SECONDS } from './battleEngine.js';

const BACKINGS = ['piano-swing', 'porch-folk', 'bossa', 'marimba-run', 'handclap-pop', 'harp-dance', 'woodblock-rag', 'kalimba-groove']
    .map(id => ({ stems: [`acoustic/${id}-drums`, `acoustic/${id}-music`] }));
const BACKING_LOOP_SECONDS = BEAT_SECONDS * 32; // Eight bars, with both stems starting on the same downbeat.

// One audio clock keeps the beat, voices and combat cues together on mobile.
export class BattleAudio {
    constructor() {
        this.context = null;
        this.buffers = new Map();
        this.nodes = new Set();
        this.origin = 0;
        this.muted = false;
        this.clockMode = 'performance';
        this.backing = BACKINGS[0];
        this.backingQueue = [...BACKINGS];
    }

    selectBacking(random = Math.random) {
        // Exhaust the catalogue in random order before repeating a track.
        const previous = this.backing;
        const cycleEnded = !this.backingQueue.length;
        if (cycleEnded) this.backingQueue = [...BACKINGS];
        const choices = cycleEnded ? this.backingQueue.filter(backing => backing !== previous) : this.backingQueue;
        this.backing = choices[Math.floor(random() * choices.length)];
        this.backingQueue.splice(this.backingQueue.indexOf(this.backing), 1);
        if (previous !== this.backing) {
            for (const stem of previous.stems) this.buffers.delete(stem);
        }
    }

    async unlock({ replace = false } = {}) {
        try {
            if (navigator.audioSession) {
                this.previousSessionType ??= navigator.audioSession.type;
                navigator.audioSession.type = 'playback';
            }
        } catch { /* Optional Safari Audio Session API; Web Audio still works without it. */ }
        if (replace || this.context?.state === 'closed') {
            this.stop();
            const previous = this.context;
            this.context = null;
            if (previous) {
                previous.onstatechange = null;
                // A stalled close/resume promise must not consume this user gesture.
                if (previous.state !== 'closed') previous.close().catch(() => {});
            }
        }
        if (!this.context) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) throw new Error('浏览器暂不支持战斗音频，可以选择静音开战。');
            this.context = new AudioContext();
            this.master = this.context.createGain();
            this.master.gain.value = this.muted ? 0 : 0.85;
            const compressor = this.context.createDynamicsCompressor();
            compressor.threshold.value = -16;
            compressor.knee.value = 12;
            compressor.ratio.value = 4;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.18;
            this.output = compressor;
            this.master.connect(compressor);
            compressor.connect(this.context.destination);
            this.music = this.context.createGain();
            this.music.gain.value = 1;
            this.music.connect(this.master);
            this.drums = this.context.createGain();
            this.drums.connect(this.master);
            this.voices = this.context.createGain();
            this.voices.gain.value = 1;
            this.voices.connect(this.master);
            this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
            const data = this.noise.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        }
        // Called directly by Start / Resume, before fetching any assets.
        const context = this.context;
        await context.resume();
        if (this.context !== context || context.state !== 'running') throw new Error('声音尚未启动，请再点一次开战，或选择静音开战。');
    }

    now() {
        return this.clockMode === 'audio' ? this.context.currentTime : performance.now() / 1000;
    }

    usePerformanceClock() {
        const before = this.now();
        this.clockMode = 'performance';
        const offset = this.now() - before;
        this.origin += offset;
        return offset;
    }

    setMuted(muted) {
        this.muted = muted;
        if (this.master && this.context) this.master.gain.setTargetAtTime(muted ? 0 : 0.85, this.context.currentTime, 0.03);
    }

    async load(id, path, trim = false) {
        if (this.buffers.has(id)) return;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
            const response = await fetch(`${import.meta.env.BASE_URL}audio/${path}?v=neural-v2`, { signal: controller.signal });
            if (!response.ok) throw new Error(`音频加载失败：${id}`);
            const decoded = await this.context.decodeAudioData(await response.arrayBuffer());
            this.buffers.set(id, trim ? this.trimSilence(decoded) : decoded);
        } finally { clearTimeout(timeout); }
    }

    async preload(questions, onProgress = () => {}) {
        let loaded = 0;
        let cursor = 0;
        const worker = async () => {
            while (cursor < questions.length) {
                const question = questions[cursor++];
                await this.load(question.id, `battle/${question.id}.mp3`, true);
                if (question.grammar) await this.load(`echo:${question.id}`, `echoes/${question.id}.mp3`, true);
                onProgress(++loaded, questions.length);
            }
        };
        await Promise.all([
            ...this.backing.stems.map(stem => this.load(stem, `music/${stem}.mp3`)),
            this.load('bomb-hit', 'music/bomb-hit.mp3'),
            ...Array.from({ length: Math.min(4, questions.length) }, worker),
        ]);
    }

    ready(question) {
        return this.buffers.has(question.id) && (!question.grammar || this.buffers.has(`echo:${question.id}`));
    }

    async prepareResume(question, timeoutMs = 2000) {
        let timer;
        let expired = false;
        const prepare = async () => {
            // Safari can keep a running clock on a silent output route. Rebuild on
            // the Resume / Sound-on gesture, keeping the decoded MP3s in memory.
            await this.unlock({ replace: true });
            if (expired) return false;
            if (!this.ready(question) || ![...this.backing.stems, 'bomb-hit'].every(id => this.buffers.has(id))) await this.preload([question]);

            const context = this.context;
            if (expired || context?.state !== 'running') return false;
            const time = context.currentTime;
            // An interrupted browser can report "running" while its clock is frozen.
            await new Promise(resolve => setTimeout(resolve, 100));
            return !expired && this.context === context && context.state === 'running' && context.currentTime > time;
        };

        try {
            return await Promise.race([
                prepare(),
                new Promise(resolve => { timer = setTimeout(() => resolve(false), timeoutMs); }),
            ]);
        } catch {
            return false;
        } finally {
            expired = true;
            clearTimeout(timer);
        }
    }

    retain(questions) {
        const keep = new Set([...this.backing.stems, 'bomb-hit', 'rap-preview']);
        for (const question of questions) { keep.add(question.id); keep.add(`echo:${question.id}`); }
        for (const key of this.buffers.keys()) if (!keep.has(key)) this.buffers.delete(key);
    }

    async preloadPreview() {
        await this.load('rap-preview', 'previews/acoustic-rap-15s.mp3');
    }

    playPreview() {
        this.stop();
        this.speak('rap-preview', this.context.currentTime + 0.06);
        return this.buffers.get('rap-preview').duration;
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

    start(onInterrupt) {
        this.stop();
        this.clockMode = !this.muted && this.context?.state === 'running' ? 'audio' : 'performance';
        this.origin = this.now() + 0.12;
        if (this.clockMode !== 'audio') return this.origin;
        if (onInterrupt) {
            const context = this.context;
            context.onstatechange = () => {
                if (this.context === context && this.clockMode === 'audio' && ['suspended', 'interrupted'].includes(context.state)) {
                    onInterrupt();
                }
            };
        }
        this.music.gain.cancelScheduledValues(this.context.currentTime);
        this.music.gain.value = 1;
        const [drums, music] = this.backing.stems;
        this.play(drums, this.origin, 1, this.drums, BACKING_LOOP_SECONDS);
        this.play(music, this.origin, 1, this.music, BACKING_LOOP_SECONDS);
        return this.origin;
    }

    nextBeat(time = this.now()) {
        return this.origin + Math.ceil(Math.max(0, time - this.origin) / BEAT_SECONDS) * BEAT_SECONDS;
    }

    vocalTiming(id) {
        const duration = this.buffers.get(id)?.duration || 1.5;
        const when = this.nextBeat(this.now() + 0.36); // Let the impact land before the teaching voice.
        const echoId = this.buffers.has(`echo:${id}`) ? `echo:${id}` : duration < 1.15 ? id : null;
        const echoWhen = when + Math.max(2, Math.ceil((duration + 0.08) / BEAT_SECONDS)) * BEAT_SECONDS;
        const end = echoId ? echoWhen + (this.buffers.get(echoId)?.duration || duration) : when + duration;
        return { when, duration, echoId, echoWhen, end };
    }

    feedbackEnd(id) {
        const earliest = Math.max(this.now() + FEEDBACK_SECONDS, this.vocalTiming(id).end + 0.18);
        return this.origin + Math.ceil((earliest - this.origin) / (BEAT_SECONDS * 4)) * BEAT_SECONDS * 4;
    }

    play(id, when, volume = 1, destination = this.voices, loopSeconds = 0) {
        const buffer = this.buffers.get(id);
        if (!buffer || !this.context || this.context.state !== 'running') return;
        const source = this.context.createBufferSource();
        const gain = this.context.createGain();
        source.buffer = buffer;
        if (loopSeconds) { source.loop = true; source.loopEnd = loopSeconds; }
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(destination);
        this.track(source, [gain]);
        source.start(when);
    }

    speak(id, when = this.context?.currentTime || 0, volume = 1) {
        this.play(id, when, volume);
    }

    respond(question, correct, combo) {
        if (this.muted || this.clockMode !== 'audio' || this.context?.state !== 'running') return;
        const now = this.context.currentTime;
        if (correct) {
            this.play('bomb-hit', now, combo >= 3 ? 1 : 0.8, this.master);
            [523.25, 659.25, combo >= 3 ? 1046.5 : 783.99].forEach((note, i) => this.tone(note, now + 0.04 + i * 0.055, 0.16, 0.13, 'triangle', this.master));
        } else {
            this.tone(130, now, 0.23, 0.45, 'sawtooth', this.master, 45);
            this.hiss(now, 0.16, 0.25, 800, this.master);
        }
        const { when, echoId, echoWhen, end } = this.vocalTiming(question.id);
        this.music.gain.cancelScheduledValues(now);
        this.music.gain.setTargetAtTime(0.42, now, 0.025);
        this.music.gain.setTargetAtTime(1, end + 0.12, 0.08);
        this.speak(question.id, when);
        if (echoId) this.speak(echoId, echoWhen, echoId === question.id ? 0.42 : 0.65);
    }

    stop() {
        for (const node of this.nodes) {
            try { node.stop(); } catch { /* A finished one-shot may already be stopped. */ }
        }
        this.nodes.clear();
    }

    record(seconds = 15) {
        if (!this.context || this.context.state !== 'running' || !window.MediaRecorder) return Promise.reject(new Error('请先开始有声战斗，再录制音轨。'));
        if (this.recorder?.state === 'recording') return Promise.reject(new Error('音轨正在录制。'));
        const destination = this.context.createMediaStreamDestination();
        this.output.connect(destination);
        const mimeType = ['audio/webm;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
        const recorder = new MediaRecorder(destination.stream, mimeType ? { mimeType } : undefined);
        this.recorder = recorder;
        return new Promise((resolve, reject) => {
            const chunks = [];
            let cleaned = false;
            const timer = setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop(); }, seconds * 1000);
            const cleanup = () => {
                if (cleaned) return;
                cleaned = true;
                clearTimeout(timer);
                try { this.output.disconnect(destination); } catch { /* Closing a context can already disconnect its graph. */ }
                destination.stream.getTracks().forEach(track => track.stop());
                this.recorder = null;
            };
            recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
            recorder.onerror = () => { cleanup(); reject(new Error('音轨录制失败，请重试。')); };
            recorder.onstop = () => { cleanup(); resolve(new Blob(chunks, { type: recorder.mimeType })); };
            recorder.start();
        });
    }

    async close() {
        if (this.recorder?.state === 'recording') this.recorder.stop();
        this.stop();
        const context = this.context;
        this.context = null;
        if (context && context.state !== 'closed') await context.close();
        try {
            if (navigator.audioSession?.type === 'playback' && this.previousSessionType !== undefined) navigator.audioSession.type = this.previousSessionType;
        } catch { /* The browser owns the audio session when this API is unavailable. */ }
    }
}
