import { useCallback, useEffect, useRef, useState } from 'react';
import chapters from './questions.json';
import { BattleAudio } from './battleAudio.js';
import { DIFFICULTIES, BEAT_SECONDS, PALACE_RANKS, advanceBattle, battleGrade, enemyHealth, initialBattle, missedQuestions, resolveAnswer, startBattle } from './battleEngine.js';
import { learningStats, selectQuestions, updateLearning } from './learning.js';
import Opponent from './Opponent.jsx';
import StudyGuide from './StudyGuide.jsx';
import './battle.css';
import './readability.css';

const ACTIVE_PHASES = ['countdown', 'question', 'feedback'];
const RECORDS_KEY = 'de_palace_battle_v1';
const LEARNING_KEY = 'de_palace_learning_v1';

function readRecords(key = RECORDS_KEY) {
    try {
        const saved = JSON.parse(localStorage.getItem(key) || '{}');
        return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch { return {}; }
}

function GermanPrompt({ text, answer }) {
    const parts = text.split('___');
    return <span lang="de">{parts[0]}{parts.length > 1 && <><span className={`palace-blank ${answer ? 'is-filled' : ''}`}>{answer || '?'}</span>{parts[1]}</>}</span>;
}

export default function BattleApp({ onExit }) {
    const [stageId, setStageId] = useState(chapters[0].id);
    const [difficulty, setDifficulty] = useState(() => {
        try { return localStorage.getItem('de_palace_difficulty') === 'hard' ? 'hard' : 'normal'; } catch { return 'normal'; }
    });
    const [roundMode, setRoundMode] = useState('quick');
    const [topic, setTopic] = useState('all');
    const [game, setGame] = useState(initialBattle);
    const [clock, setClock] = useState({ remaining: 10, beat: 0, count: 4 });
    const [muted, setMuted] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [loadingCount, setLoadingCount] = useState(0);
    const [error, setError] = useState('');
    const [records, setRecords] = useState(readRecords);
    const [capture, setCapture] = useState({ state: 'idle', started: 0 });
    const captureSeconds = new URLSearchParams(window.location.search).get('seconds') === '30' ? 30 : 15;
    const [progress, setProgress] = useState(() => readRecords(LEARNING_KEY));
    const gameRef = useRef(game);
    const audioRef = useRef(null);
    const deadlineRef = useRef(0);
    const requestRef = useRef(0);
    const previewTimer = useRef(null);
    const stage = chapters.find(chapter => chapter.id === stageId);
    const settings = DIFFICULTIES[difficulty];
    const topics = [...new Set(stage.questions.map(item => item.topic || '基础训练'))];
    const stageStats = learningStats(stage.questions, progress);
    const scopedQuestions = stage.questions.filter(item => topic === 'all' || (item.topic || '基础训练') === topic);
    const roundSize = roundMode === 'full' ? scopedQuestions.length : Math.min(10, roundMode === 'review' ? learningStats(scopedQuestions, progress).review : scopedQuestions.length);
    const question = game.questions[game.index];
    const latest = game.answers.at(-1);
    const active = ACTIVE_PHASES.includes(game.phase);
    const inBattle = active || game.phase === 'paused';
    const correctCount = game.answers.filter(answer => answer.correct).length;
    const grade = battleGrade(game);
    const defeated = game.phase === 'result' && correctCount === game.questions.length;
    const showFeedback = game.phase === 'feedback' || (game.phase === 'paused' && game.pausedFrom === 'feedback');

    const commit = useCallback(next => {
        gameRef.current = next;
        setGame(next);
    }, []);

    useEffect(() => {
        const audio = new BattleAudio();
        audioRef.current = audio;
        return () => {
            requestRef.current++;
            clearTimeout(previewTimer.current);
            audio.close();
            audioRef.current = null;
        };
    }, []);

    useEffect(() => {
        try { localStorage.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Private browsing can disable storage. */ }
    }, [records]);

    useEffect(() => {
        try { localStorage.setItem(LEARNING_KEY, JSON.stringify(progress)); } catch { /* Practice remains available without storage. */ }
    }, [progress]);

    useEffect(() => {
        try { localStorage.setItem('de_palace_difficulty', difficulty); } catch { /* Keep the selection in memory. */ }
    }, [difficulty]);

    const pause = useCallback(() => {
        const current = gameRef.current;
        if (!ACTIVE_PHASES.includes(current.phase)) return;
        audioRef.current.stop();
        commit({ ...current, phase: 'paused', pausedFrom: current.phase });
    }, [commit]);

    useEffect(() => {
        const visibility = () => { if (document.hidden) pause(); };
        document.addEventListener('visibilitychange', visibility);
        return () => document.removeEventListener('visibilitychange', visibility);
    }, [pause]);

    const finish = useCallback(next => {
        audioRef.current.stop();
        setRecords(previous => {
            const key = `${stageId}:${next.difficulty}:${roundMode}`;
            const old = previous[key];
            const cleared = next.questions.length === chapters.find(chapter => chapter.id === stageId).questions.length && next.answers.every(answer => answer.correct);
            return { ...previous, [key]: { score: Math.max(old?.score || 0, next.score), cleared: Boolean(old?.cleared || cleared), bankSize: stage.questions.length } };
        });
        commit(next);
    }, [commit, stageId, stage.questions.length, roundMode]);

    const submit = useCallback(choice => {
        const current = gameRef.current;
        if (current.phase !== 'question') return;
        const audio = audioRef.current;
        const next = resolveAnswer(current, choice, deadlineRef.current - audio.now());
        deadlineRef.current = audio.feedbackEnd(current.questions[current.index].id);
        audio.respond(current.questions[current.index], next.answers.at(-1).correct, next.combo);
        setProgress(previous => updateLearning(previous, [next.answers.at(-1)]));
        commit(next);
    }, [commit]);

    useEffect(() => {
        if (!ACTIVE_PHASES.includes(game.phase)) return;
        let frame;
        const tick = () => {
            const audio = audioRef.current;
            if (!audio) return;
            const current = gameRef.current;
            if (!ACTIVE_PHASES.includes(current.phase)) return;
            const now = audio.now();
            const remaining = Math.max(0, deadlineRef.current - now);
            setClock({ remaining, beat: Math.max(0, Math.floor((now - audio.origin) / BEAT_SECONDS)) % 8, count: Math.max(1, Math.ceil(remaining / BEAT_SECONDS)) });
            if (remaining <= 0) {
                if (current.phase === 'countdown') {
                    deadlineRef.current += current.seconds;
                    setClock(previous => ({ ...previous, remaining: current.seconds }));
                    commit({ ...current, phase: 'question' });
                } else if (current.phase === 'question') {
                    submit(null);
                } else {
                    const next = advanceBattle(current);
                    if (next.phase === 'result') finish(next);
                    else {
                        deadlineRef.current += next.seconds;
                        setClock(previous => ({ ...previous, remaining: next.seconds }));
                        commit(next);
                    }
                }
                return;
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [game.phase, game.index, commit, submit, finish]);

    useEffect(() => {
        const onKey = event => {
            if (event.repeat) return;
            if (['1', '2', '3'].includes(event.key) && gameRef.current.phase === 'question') {
                event.preventDefault();
                submit(gameRef.current.questions[gameRef.current.index].options[Number(event.key) - 1]);
            } else if (event.key === 'Escape') pause();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [pause, submit]);

    const stopPreview = () => {
        clearTimeout(previewTimer.current);
        audioRef.current.stop();
        setPreviewing(false);
    };

    const begin = async (questions, silent = false) => {
        let selected = questions || selectQuestions(stage.questions, { progress, mode: roundMode, topic });
        if (!selected.length) {
            selected = selectQuestions(stage.questions, { progress, topic });
            setRoundMode('quick');
        }
        if (!selected.length) return;
        const planned = startBattle(selected, { difficulty });
        const request = ++requestRef.current;
        stopPreview();
        setError('');
        setLoadingCount(0);
        commit({ ...planned, phase: 'loading' });
        const audio = audioRef.current;
        try {
            if (!silent) {
                await audio.unlock();
                await audio.preload(selected, count => { if (request === requestRef.current) setLoadingCount(count); });
            }
            if (request !== requestRef.current) return;
            audio.setMuted(silent || muted);
            if (silent) setMuted(true);
            if (audio.context) audio.context.onstatechange = () => { if (['suspended', 'interrupted'].includes(audio.context?.state)) pause(); };
            const origin = audio.start();
            deadlineRef.current = origin + BEAT_SECONDS * 4;
            const next = planned;
            commit(document.hidden ? { ...next, phase: 'paused', pausedFrom: 'countdown' } : next);
            window.scrollTo({ top: 0, behavior: 'auto' });
            if (document.hidden) audio.stop();
        } catch {
            if (request !== requestRef.current) return;
            audio.stop();
            setError('声音暂时没准备好。可以重试，或先静音开战；练习进度不受影响。');
            commit(initialBattle(difficulty));
        }
    };

    const resume = async () => {
        const audio = audioRef.current;
        try {
            if (!muted) await audio.unlock();
            const current = gameRef.current;
            if (current.phase !== 'paused') return;
            const origin = audio.start();
            if (current.pausedFrom === 'feedback') {
                const previous = current.answers.at(-1);
                audio.respond(current.questions[current.index], previous.correct, current.combo);
                deadlineRef.current = audio.feedbackEnd(current.questions[current.index].id);
                commit({ ...current, phase: 'feedback' });
            } else {
                deadlineRef.current = origin + BEAT_SECONDS * 4;
                commit({ ...current, phase: 'countdown' });
            }
            setError('');
        } catch { setError('请再点一次继续，让浏览器恢复声音。'); }
    };

    const preview = async () => {
        if (previewing) { requestRef.current++; stopPreview(); return; }
        const request = ++requestRef.current;
        const audio = audioRef.current;
        setPreviewing(true);
        setError('');
        try {
            await audio.unlock();
            await audio.preloadPreview();
            if (request !== requestRef.current) return;
            setMuted(false);
            audio.setMuted(false);
            const duration = audio.playPreview();
            previewTimer.current = setTimeout(stopPreview, duration * 1000 + 150);
        } catch {
            if (request !== requestRef.current) return;
            stopPreview();
            setError('试听暂未加载成功，请重试；也可以先静音开战。');
        }
    };

    const lobby = nextStage => {
        requestRef.current++;
        stopPreview();
        if (nextStage) { setStageId(nextStage); setTopic('all'); setRoundMode('quick'); }
        setError('');
        commit(initialBattle(difficulty));
        window.scrollTo({ top: 0, behavior: 'auto' });
    };

    const toggleMute = async () => {
        if (muted) {
            const wasActive = ACTIVE_PHASES.includes(gameRef.current.phase);
            if (wasActive) pause();
            try {
                await audioRef.current.unlock();
                if (gameRef.current.questions.length) await audioRef.current.preload(gameRef.current.questions);
            } catch { setError('声音未能恢复，可以保持静音继续。'); return; }
            audioRef.current.setMuted(false);
            setMuted(false);
            if (wasActive) await resume();
            return;
        }
        audioRef.current.setMuted(!muted);
        setMuted(!muted);
    };

    const captureAudio = async () => {
        setCapture({ state: 'recording', started: Date.now() });
        try {
            const blob = await audioRef.current.record(captureSeconds);
            const url = URL.createObjectURL(blob);
            const filename = blob.type.includes('mp4') ? 'palace-battle-audio.m4a' : 'palace-battle-audio.webm';
            setCapture(previous => ({ ...previous, state: 'done', url, filename }));
        } catch (failure) {
            setError(failure.message);
            setCapture({ state: 'idle', started: 0 });
        }
    };

    const health = inBattle || game.phase === 'result' ? enemyHealth(game) : 100;
    const impact = game.phase === 'feedback' ? (latest?.correct ? (game.combo >= 3 ? 'heavy' : 'hit') : 'hurt') : '';

    return (
        <div className="palace-app">
            {new URLSearchParams(window.location.search).get('capture') === '1' && <div className={`palace-capture-control is-${capture.state}`} data-started={capture.started}>{capture.url ? <a href={capture.url} download={capture.filename}>下载战斗音轨</a> : <button disabled={!active || muted || capture.state !== 'idle'} onClick={captureAudio}>录制 {captureSeconds} 秒战斗音轨</button>}</div>}
            <header className="palace-header">
                <a className="palace-brand" href="#battle" onClick={event => { event.preventDefault(); lobby(); }} aria-label="回到战场首页">
                    <span className="palace-seal">战</span><span>德语 · 宫廷对决<small>DEUTSCH / PALACE DUEL</small></span>
                </a>
                <div className="palace-header-actions">
                    <span className="palace-tempo"><span />96 BPM</span>
                    <button className="palace-icon-button" onClick={toggleMute} aria-label={muted ? '开启声音' : '关闭声音'} aria-pressed={!muted}>{muted ? '♩ 声音已关' : '♫ 声音已开'}</button>
                    <button className="palace-course" onClick={() => { requestRef.current++; stopPreview(); onExit(); }}>原课程 ↗</button>
                </div>
            </header>

            <main className="palace-main">
                <div className="palace-intro">
                    <div><p className="palace-eyebrow">A2—B1 · 普通 10 秒 / 困难 5 秒 · 中德双语</p><h1>{inBattle ? '这一招，用德语接。' : game.phase === 'result' ? defeated ? '漂亮，打得有理有据。' : '记住这一招，再战。' : <>把语法，<em>打成肌肉记忆。</em></>}</h1></div>
                    <p className="palace-intro-note">{inBattle ? '听鼓点，看语境。选对出手，选错挨打。' : '大橘守冠词，皇后查词尾，容嬷嬷突袭单词。\n这一次，让他们见识你的德语。'}</p>
                </div>

                <div className={`palace-layout ${inBattle ? 'is-playing' : ''}`}>
                    <section className={`palace-arena ${impact ? `arena-${impact}` : ''}`} aria-label={`${stage.enemy}的战场`}>
                        <div className="palace-arena-top"><span>紫禁练武场 <i>/ TRAINING GROUND</i></span><span className="palace-live">{inBattle ? '● 交战中' : game.phase === 'result' ? '● 本轮结算' : '● 等你出招'}</span></div>
                        <div className="palace-health-row">
                            <div className="palace-health"><div><b>你 · 德语挑战者</b><span>{inBattle || game.phase === 'result' ? game.hearts : 3} / 3</span></div><div className="palace-health-track"><span style={{ width: `${(inBattle || game.phase === 'result' ? game.hearts : 3) / 3 * 100}%` }} /></div></div>
                            <span className="palace-vs">VS</span>
                            <div className="palace-health enemy"><div><b>{stage.enemy} · {stage.enemyTitle}</b><span>{Math.round(health)} / 100</span></div><div className="palace-health-track"><span style={{ width: `${health}%`, background: stage.color }} /></div></div>
                        </div>

                        <div className="palace-fight-scene">
                            <div className="palace-moon" /><div className="palace-lattice lattice-left" /><div className="palace-lattice lattice-right" /><div className="palace-floor" />
                            <div className="palace-enemy-title"><span>第 {stage.number} 关</span><strong>{stage.enemy}</strong><small>{stage.german}</small></div>
                            <div className="palace-enemy-figure" key={`${stageId}-${game.answers.length}-${impact}`}><Opponent type={stage.enemyType} /><div className="palace-enemy-shadow" /></div>
                            <div className="palace-player"><div className="palace-player-hair" /><div className="palace-player-face">•‿•</div><div className="palace-player-robe">德</div><div className="palace-player-arm" /><span>挑战者</span></div>
                            {(impact === 'hit' || impact === 'heavy') && <div className={`palace-bomb ${impact === 'heavy' ? 'is-heavy' : ''}`} key={`bomb-${game.answers.length}`} aria-hidden="true"><i /><i /><i /><i /><i /><i /><strong>BOMB!</strong></div>}
                            {impact && <div className={`palace-impact impact-${impact}`} key={`impact-${game.answers.length}`}><span>{impact === 'hurt' ? '反击' : impact === 'heavy' ? '破防！' : '命中！'}</span><b>{impact === 'hurt' ? '−1 ♥' : `+${latest.points}`}</b></div>}
                            {game.combo >= 2 && inBattle && <div className="palace-combo" key={`combo-${game.combo}`}><strong>{game.combo}</strong><span>连击<small>COMBO</small></span></div>}
                            {game.phase === 'countdown' && <div className="palace-countdown" aria-live="polite"><span>跟上节拍</span><strong key={clock.count}>{clock.count > 4 ? 4 : clock.count}</strong><small>准备出招 · MACH DICH BEREIT</small></div>}
                            {game.phase === 'paused' && <div className="palace-pause-overlay"><span>战场已暂停</span><p>歇一拍，回来再接招。</p><button className="palace-primary" onClick={resume}>继续战斗 →</button><button className="palace-text-button" onClick={() => lobby()}>返回选关</button></div>}
                            {game.phase === 'result' && <div className={`palace-result-stamp ${defeated ? 'is-won' : ''}`}>{defeated ? '击破' : game.hearts <= 0 ? '中招' : '再战'}</div>}
                        </div>

                        <div className="palace-taunt" aria-live="polite"><span>{stage.enemy}</span><p>「{game.phase === 'feedback' ? latest.correct ? stage.hitLine : stage.attackLine : game.phase === 'result' ? defeated ? '今日算你厉害，下回再来！' : '还有破绽，再练几招。' : stage.taunt}」</p></div>
                        <div className="palace-arena-bottom"><div className={`palace-beats ${active || previewing ? 'is-running' : ''}`} aria-label="战斗节奏">{Array.from({ length: 8 }, (_, i) => <span className={clock.beat === i && active ? 'is-beat' : ''} key={i} />)}</div><span>{inBattle ? DIFFICULTIES[game.difficulty].label : settings.label} {inBattle ? game.seconds : settings.seconds} 秒 <i>·</i> 四拍回响</span><span className="palace-tempo-label">{inBattle ? '随时暂停思考' : '96 BPM'}</span></div>
                    </section>

                    <section className="palace-control-panel" aria-label="练习与操作">
                        {game.phase === 'lobby' || game.phase === 'loading' ? <>
                            <div className="palace-panel-heading"><span className="palace-eyebrow">CHOOSE YOUR BATTLE</span><span className="palace-edition">三关 · {chapters.reduce((total, chapter) => total + chapter.questions.length, 0)} 题</span></div>
                            <h2>先挑一个，练到会。</h2>
                            <div className="palace-stage-list">{chapters.map(chapter => <button key={chapter.id} className={`palace-stage ${stageId === chapter.id ? 'is-selected' : ''}`} onClick={() => lobby(chapter.id)} disabled={game.phase === 'loading'} aria-pressed={stageId === chapter.id}>
                                <span className="palace-stage-number">{chapter.number}</span><span className="palace-stage-copy"><strong>{chapter.title}</strong><small>{chapter.enemy} · {chapter.questions.length} 题 · 熟练 {learningStats(chapter.questions, progress).mastered}/{chapter.questions.length}</small></span><span className="palace-stage-arrow">↗</span>
                            </button>)}</div>
                            <p className="palace-stage-description">{stage.description}</p>
                            <div className="palace-difficulty" role="group" aria-label="战斗难度">{Object.entries(DIFFICULTIES).map(([key, item]) => <button key={key} className={difficulty === key ? 'is-selected' : ''} disabled={game.phase === 'loading'} aria-pressed={difficulty === key} onClick={() => setDifficulty(key)}><strong>{item.label}</strong><span>{item.seconds} 秒 / 题</span></button>)}</div>
                            <div className="palace-practice-options"><label>练习方式<select aria-label="练习方式" value={roundMode} disabled={game.phase === 'loading'} onChange={event => setRoundMode(event.target.value)}><option value="quick">快战 · 每局最多 10 题</option><option value="full">整关训练 · 全部题目</option><option value="review" disabled={stageStats.review === 0}>错题复习 · {stageStats.review} 题待巩固</option></select></label><label>专项主题<select aria-label="专项主题" value={topic} disabled={game.phase === 'loading'} onChange={event => setTopic(event.target.value)}><option value="all">全部主题</option>{topics.map(item => <option key={item}>{item}</option>)}</select></label></div>
                            <div className="palace-learning-progress"><span>已练 {stageStats.seen}/{stage.questions.length}</span><span>已熟练 {stageStats.mastered}</span><span>待巩固 {stageStats.review}</span></div>
                            <StudyGuide stageId={stage.id} />
                            <div className="palace-start-actions"><button className="palace-primary" disabled={game.phase === 'loading'} onClick={() => begin()}>{game.phase === 'loading' ? `正在备战 · ${loadingCount} / ${game.questions.length}` : `向${stage.enemy}出招`}<span>↗</span></button><button className="palace-preview" onClick={preview} disabled={game.phase === 'loading'} aria-pressed={previewing}>{previewing ? '■ 停止试听' : '▶ 先听一段 Rap'}</button></div>
                            <p className="palace-small-note">本局 {roundSize} 题 · 每题 {settings.seconds} 秒 · 错三次本轮结束</p>
                        </> : game.phase === 'result' ? <>
                            <span className="palace-eyebrow">ROUND COMPLETE / 本轮战报</span><h2>{defeated ? `${stage.enemy}，接不住了。` : `${stage.enemy}还有破绽可打。`}</h2>
                            <div className={`palace-grade ${grade.rating >= 9 ? 'is-royal' : ''}`} aria-label={`本轮评级 ${grade.rating}分 ${grade.title}`}><div><span>本轮封号</span><strong>{grade.title}</strong></div><p><b>{grade.rating}</b><span>/ 10 分</span></p></div>
                            <p className="palace-grade-note">按本轮答对题数折算为 10 分，全部答对才能登基。战斗积分：{game.score}</p>
                            <details className="palace-rank-ladder"><summary>查看宫廷晋升阶梯</summary><ol>{PALACE_RANKS.slice(1).map((title, index) => <li key={title} className={grade.rating === index + 1 ? 'is-current' : ''}><span>{index + 1} 分</span><strong>{title}</strong></li>)}</ol></details>
                            <div className="palace-result-stats"><div><b>{correctCount}/{game.questions.length}</b><span>答对题数</span></div><div><b>{game.bestCombo}</b><span>最高连击</span></div><div><b>{game.hearts}</b><span>剩余生命</span></div></div>
                            <div className="palace-review-list">{game.questions.map(item => {
                                const result = game.answers.find(answer => answer.id === item.id);
                                return <div key={item.id} className={result?.correct ? 'is-correct' : ''}><span>{result?.correct ? '✓' : result ? '↺' : '·'}</span><p><strong lang="de">{item.chant}</strong><small>{item.chantZh}{!result ? ' · 尚未交手' : result.choice === null ? ' · 超时' : !result.correct ? ` · 你选了 ${result.choice}` : ''}</small></p><button aria-label={`朗读 ${item.chant}`} onClick={async () => { try { await audioRef.current.unlock(); await audioRef.current.preload([item]); audioRef.current.speak(item.id); } catch { setError('这条语音暂未加载成功，请重试。'); } }}>♫</button></div>;
                            })}</div>
                            <div className="palace-result-actions"><button className="palace-primary" onClick={() => missedQuestions(game).length ? begin(missedQuestions(game)) : begin()}>{missedQuestions(game).length ? `复仇 · 再练 ${missedQuestions(game).length} 题` : '再打一局'}<span>↗</span></button><button className="palace-preview" onClick={() => lobby(chapters[(chapters.findIndex(item => item.id === stageId) + 1) % chapters.length].id)}>换个对手 →</button></div>
                        </> : <>
                            <div className="palace-panel-heading palace-round-toolbar"><div><span className="palace-eyebrow">{stage.title} · {DIFFICULTIES[game.difficulty].label} {game.seconds}s</span><span className="palace-edition">第 {game.index + 1} / {game.questions.length} 招</span></div><button className="palace-pause-main" onClick={game.phase === 'paused' ? resume : pause} aria-label={game.phase === 'paused' ? '继续本轮战斗' : '暂停思考'}>{game.phase === 'paused' ? '▶ 继续战斗' : 'Ⅱ 暂停思考'}</button></div>
                            <div className={`palace-question-timer ${clock.remaining < 1.5 && game.phase === 'question' ? 'is-urgent' : ''}`}><span>{game.phase === 'countdown' ? '准备出招' : game.phase === 'feedback' ? '听一遍，记住这一招' : game.phase === 'paused' ? '倒计时已暂停' : '敌人正在蓄力'}</span><strong>{game.phase === 'question' ? `${clock.remaining.toFixed(1)}s` : game.phase === 'feedback' ? latest.correct ? '命中 ✓' : latest.choice === null ? '超时 ↺' : '中招 ↺' : '—'}</strong></div>
                            <div className="palace-timer-track"><span style={{ width: game.phase === 'question' ? `${clock.remaining / game.seconds * 100}%` : '100%' }} /></div>
                            {question && <div className="palace-question-content" data-question-id={question.id} key={question.id}>
                                <span className="palace-noun">{question.noun}</span>
                                <h2 className="palace-question-de"><GermanPrompt text={question.promptDe} answer={showFeedback ? question.answer : null} /></h2>
                                <p className="palace-question-zh">{question.promptZh}</p>
                                <div className="palace-options">{question.options.map((option, index) => <button key={option} disabled={game.phase !== 'question'} onClick={() => submit(option)} className={showFeedback ? option === question.answer ? 'is-answer' : option === latest.choice ? 'is-wrong' : 'is-dimmed' : ''}><kbd>{index + 1}</kbd><span lang={/\p{Script=Han}/u.test(option) ? 'zh' : 'de'}>{option}</span><span className="palace-option-mark">{showFeedback && option === question.answer ? '✓' : '↗'}</span></button>)}</div>
                                {showFeedback ? <div className={`palace-answer-feedback ${latest.correct ? 'is-correct' : ''}`} role="status"><strong><span lang="de">{question.chant}</span><span>{question.chantZh}</span></strong><p>{question.rule}</p><small lang="de">{question.solutionDe}</small><small>{question.solutionZh}</small>{game.phase === 'feedback' && <button className="palace-read-pause" onClick={pause}>Ⅱ 暂停，慢慢看解析</button>}</div> : <p className="palace-answer-tip">{game.phase === 'countdown' ? '看清语境，等鼓点落下再出手。' : '点击答案即出招 · 随时点“暂停思考” · 键盘 1 / 2 / 3'}</p>}
                            </div>}
                        </>}
                        {error && <div className="palace-error" role="alert"><p>{error}</p>{game.phase === 'lobby' && <button onClick={() => begin(undefined, true)}>静音开战 →</button>}</div>}
                    </section>
                </div>

                {!inBattle && game.phase !== 'result' && <div className="palace-how"><div><span>01 / 出招</span><p>选对，立刻反击。</p></div><div><span>02 / 连击</span><p>连对三题，打出重击。</p></div><div><span>03 / 回响</span><p>正确短句，踩着鼓点记。</p></div><span className="palace-how-seal">学以致打</span></div>}
                <footer className="palace-footer"><span>每天几分钟，把犹豫打成反应。</span><span>DEUTSCH LERNEN. SCHLAG FÜR SCHLAG.</span></footer>
            </main>
        </div>
    );
}
