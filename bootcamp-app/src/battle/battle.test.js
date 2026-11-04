import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { DIFFICULTIES, BEAT_SECONDS, advanceBattle, battleGrade, enemyHealth, initialBattle, missedQuestions, unansweredQuestions, resolveAnswer, startBattle } from './battleEngine.js';
import { BattleAudio } from './battleAudio.js';
import { learningStats, restoreSprint, saveSprint, selectQuestions, updateLearning } from './learning.js';

const chapters = JSON.parse(readFileSync(new URL('./questions.json', import.meta.url), 'utf8'));

test('court titles grade only actual answers and reserve emperor for a completed perfect round', () => {
    const grade = (correct, total = 10, score = 99999, answered = total) => battleGrade({ questions: Array(total), answers: Array.from({ length: answered }, (_, i) => ({ correct: i < correct })), score });
    assert.deepEqual(battleGrade(initialBattle()), { rating: 0, title: '初入宫门', correct: 0, total: 0, planned: 0, unanswered: 0 });
    for (const [correct, title] of [[1, '仆人'], [2, '宫女'], [3, '答应'], [4, '常在'], [5, '贵人'], [6, '嫔'], [7, '妃'], [8, '贵妃'], [9, '皇后'], [10, '皇帝']]) {
        assert.equal(grade(correct).title, title);
        assert.equal(grade(correct).rating, correct);
    }
    assert.equal(grade(5, 5, 0).title, '皇帝');
    assert.equal(grade(59, 60).title, '皇后');
    assert.equal(grade(80, 80).title, '皇帝');
    assert.equal(grade(3, 60, 0, 6).rating, 5); // The remaining 54 are not marked wrong.
    assert.equal(grade(3, 60, 0, 3).rating, 9); // A partial round cannot earn emperor.
    assert.deepEqual(grade(9, 10, 100), grade(9, 10, 2000));
});

test('all 700 bilingual questions have one distinct answer, a topic and the matching MP3', () => {
    assert.deepEqual(chapters.map(chapter => chapter.questions.length), [60, 60, 60, 60, 60, 400]);
    const manifest = JSON.parse(readFileSync(new URL('../../public/audio/battle/manifest.json', import.meta.url), 'utf8'));
    const ids = new Set();
    for (const chapter of chapters) for (const question of chapter.questions) {
        assert.ok(!ids.has(question.id));
        ids.add(question.id);
        assert.equal(question.options.filter(option => option === question.answer).length, 1);
        assert.equal(new Set(question.options).size, question.options.length);
        assert.equal(question.options.length, 3);
        assert.ok(question.topic);
        assert.ok(['A2', 'B1'].includes(question.level));
        assert.equal(question.grammar, chapter.id !== 'vocabulary');
        for (const key of ['promptDe', 'promptZh', 'solutionDe', 'solutionZh', 'rule', 'chant', 'chantZh']) assert.ok(question[key]);
        if (question.promptDe.includes('___')) assert.equal(question.promptDe.replace('___', question.answer), question.solutionDe);
        const audio = new URL(`../../public/audio/battle/${question.id}.mp3`, import.meta.url);
        assert.ok(statSync(audio).size > 1000);
        assert.equal(manifest[question.id], question.chant);
        if (question.source) {
            const day = JSON.parse(readFileSync(new URL(`../data/day${question.source.day}.json`, import.meta.url), 'utf8'));
            assert.ok(day.vocab.some(word => word.word === question.source.word));
        }
    }
    for (const chapter of chapters.slice(0, 5)) {
        assert.equal(new Set(chapter.questions.map(question => question.promptDe)).size, chapter.questions.length);
        for (const question of chapter.questions) {
            assert.ok(question.echo && question.chant.toLowerCase().includes(question.echo.toLowerCase()));
            assert.match(question.solutionZh, /\p{Script=Han}/u);
            assert.match(question.chantZh, /\p{Script=Han}/u);
        }
    }
    const words = chapters.find(chapter => chapter.id === 'vocabulary').questions;
    assert.equal(new Set(words.map(question => question.chant.toLocaleLowerCase('de').replace(/^(der|die|das) /, '').replace(/[()]/g, ''))).size, 400);
    assert.equal(words.filter(question => question.promptDe === 'Wie heißt das auf Deutsch?').length, 200);
    assert.equal(words.filter(question => question.promptDe !== 'Wie heißt das auf Deutsch?').length, 200);
});

test('the neural voice bank covers 700 questions and all five grammar chapters have response clips', () => {
    const voices = JSON.parse(readFileSync(new URL('../../public/audio/battle/voices.json', import.meta.url), 'utf8'));
    assert.equal(voices.questions, 700);
    assert.equal(voices.lead, 'de-DE-ConradNeural');
    assert.equal(voices.response, 'de-DE-KatjaNeural');
    assert.equal(Object.keys(voices.echoes).length, 300);
    assert.equal(voices.echoes['prep-kino'], 'ins');
    assert.equal(voices.echoes['adj-tag'], 'schöner');
    for (const question of chapters.filter(chapter => chapter.id !== 'vocabulary').flatMap(chapter => chapter.questions)) {
        assert.equal(voices.echoes[question.id], question.echo);
        assert.ok(statSync(new URL(`../../public/audio/echoes/${question.id}.mp3`, import.meta.url)).size > 1000);
    }
});

test('the impact plays only on a correct answer and the teaching voice follows the impact', () => {
    const audio = new BattleAudio();
    const hits = [];
    audio.context = { currentTime: 10, state: 'running' };
    audio.now = () => 10;
    audio.origin = 0;
    audio.music = { gain: { cancelScheduledValues() {}, setTargetAtTime() {} } };
    audio.tone = () => {};
    audio.hiss = () => {};
    audio.play = id => hits.push(id);
    audio.speak = () => {};
    const question = chapters[0].questions[0];
    audio.respond(question, false, 0);
    assert.equal(hits.length, 0);
    audio.respond(question, true, 3);
    assert.deepEqual(hits, ['bomb-hit']);
    assert.ok(audio.vocalTiming(question.id).when >= 10.36);
});

test('long grammatical responses finish before the next question, without overlapping the lead', () => {
    const audio = new BattleAudio();
    audio.origin = 0;
    audio.now = () => 2.49;
    audio.buffers.set('long', { duration: 2.1 });
    audio.buffers.set('echo:long', { duration: 1.8 });
    const timing = audio.vocalTiming('long');
    assert.equal(timing.echoId, 'echo:long');
    assert.ok(timing.echoWhen >= timing.when + timing.duration + 0.08);
    assert.ok(audio.feedbackEnd('long') >= timing.end + 0.18);
    assert.equal(audio.feedbackEnd('long') % (BEAT_SECONDS * 4), 0);
});

test('eight beats provide exactly five seconds; shuffling preserves answers and source content', () => {
    assert.equal(BEAT_SECONDS * 8, 5);
    assert.equal(DIFFICULTIES.hard.seconds, 5);
    assert.equal(DIFFICULTIES.normal.seconds, 10);
    assert.equal(BEAT_SECONDS * 16, 10);
    const questions = chapters[0].questions;
    const original = JSON.stringify(questions);
    const state = startBattle(questions, { random: () => 0 });
    assert.equal(JSON.stringify(questions), original);
    assert.notDeepEqual(state.questions[0].options, questions[0].options);
    assert.deepEqual(new Set(state.questions[0].options), new Set(questions[0].options));
});

test('one click can score only once; late correct clicks count as timeouts', () => {
    const question = chapters[0].questions[0];
    const state = { ...startBattle([question], { difficulty: 'hard' }), phase: 'question' };
    const hit = resolveAnswer(state, question.answer, 4);
    assert.equal(hit.hearts, 3);
    assert.equal(hit.score, 180);
    assert.equal(resolveAnswer(hit, question.answer, 4), hit);
    const late = resolveAnswer(state, question.answer, 0);
    assert.equal(late.hearts, 2);
    assert.equal(late.answers[0].correct, false);
    assert.equal(late.answers[0].choice, null);
    assert.equal(late.score, 0);
});

test('a perfect round deals all enemy health, earns a third-hit bonus and ends after five questions', () => {
    let state = { ...startBattle(chapters[1].questions.slice(0, 5), { difficulty: 'hard' }), phase: 'question' };
    for (let i = 0; i < 5; i++) {
        state = resolveAnswer(state, state.questions[state.index].answer, 3);
        if (i === 2) assert.equal(state.answers.at(-1).points, 210);
        state = advanceBattle(state);
    }
    assert.equal(state.phase, 'result');
    assert.equal(state.bestCombo, 5);
    assert.equal(state.hearts, 3);
    assert.equal(enemyHealth(state), 0);
    assert.equal(missedQuestions(state).length, 0);
});

test('three mistakes end a quick round; wrong and unanswered questions remain separate', () => {
    let state = { ...startBattle(chapters[2].questions.slice(0, 5)), phase: 'question' };
    state = advanceBattle(resolveAnswer(state, state.questions[0].answer, 3));
    for (let i = 0; i < 3; i++) state = advanceBattle(resolveAnswer(state, null, 0));
    assert.equal(state.phase, 'result');
    assert.equal(state.hearts, 0);
    assert.equal(state.answers.length, 4);
    assert.equal(missedQuestions(state).length, 3);
    assert.equal(unansweredQuestions(state).length, 1);
    const revenge = startBattle(missedQuestions(state));
    assert.equal(revenge.hearts, 3);
    assert.equal(revenge.score, 0);
    assert.ok(revenge.questions.every(question => question.id !== state.questions[0].id));
    assert.ok(revenge.questions.every(question => state.answers.some(answer => answer.id === question.id && !answer.correct)));
});

test('all-word sprint passes question 60, includes previously learned words and finishes all 400 despite errors', () => {
    const base = chapters.find(chapter => chapter.id === 'vocabulary').questions;
    const bank = Array.from({ length: 400 }, (_, i) => ({ ...base[i % base.length], id: `sprint-${i}` }));
    const history = Object.fromEntries(bank.slice(0, 100).map(question => [question.id, { correct: 2, wrong: 0, streak: 2, lastSeen: 1, dueAt: 99999 }]));
    const before = structuredClone(history);
    const selected = selectQuestions(bank, { progress: history, mode: 'full', random: () => .5 });
    assert.equal(selected.length, 400);
    assert.equal(new Set(selected.map(question => question.id)).size, 400);
    let state = { ...startBattle(selected, { mode: 'full', stageId: 'vocabulary' }), phase: 'question' };
    let progress = history;
    for (let index = 0; index < 400; index++) {
        const correct = index % 4 === 0;
        state = resolveAnswer(state, correct ? state.questions[state.index].answer : null, correct ? 3 : 0);
        progress = updateLearning(progress, [state.answers.at(-1)], 1000 + index);
        state = advanceBattle(state);
        if (index === 59) {
            assert.equal(state.phase, 'question');
            assert.equal(state.index, 60);
            for (const question of state.questions.slice(60)) if (before[question.id]) assert.deepEqual(progress[question.id], before[question.id]);
        }
    }
    assert.equal(state.phase, 'result');
    assert.equal(state.answers.length, 400);
    assert.equal(missedQuestions(state).length, 300);
    assert.equal(unansweredQuestions(state).length, 0);
    assert.ok(state.hearts >= 0);
    assert.deepEqual(history, before);
});

test('a serialized sprint resumes at its first unanswered item, preserving all sixty prior results', () => {
    const base = chapters[0].questions;
    const bank = Array.from({ length: 400 }, (_, i) => ({ ...base[i % base.length], id: `resume-${i}` }));
    let state = { ...startBattle(bank, { mode: 'full', stageId: 'vocabulary', difficulty: 'hard' }), phase: 'question' };
    for (let index = 0; index < 60; index++) state = advanceBattle(resolveAnswer(state, index % 3 ? state.questions[index].answer : null, index % 3 ? 2 : 0));
    const saved = JSON.parse(JSON.stringify(saveSprint(state, 1234)));
    const restored = restoreSprint(saved, bank);
    assert.equal(restored.questions.length, 400);
    assert.equal(restored.index, 60);
    assert.equal(restored.answers.filter(answer => answer.correct).length, 40);
    assert.deepEqual(restored.answers, state.answers);
    assert.equal(restored.questions[restored.index].id, 'resume-60');
    assert.equal(restored.difficulty, 'hard');
    assert.equal(restored.score, state.score);
    assert.equal(restoreSprint({ ...saved, ids: [...saved.ids, saved.ids[0]] }, bank), null);
    assert.equal(restoreSprint({ ...saved, answers: [...saved.answers].reverse() }, bank), null);
    assert.equal(restoreSprint(saved, bank.slice(1)), null);
    const feedback = resolveAnswer({ ...state, phase: 'question' }, state.questions[60].answer, 2);
    assert.equal(restoreSprint(saveSprint(feedback), bank).index, 61);
    assert.equal(saveSprint({ ...state, mode: 'quick' }), null);
    assert.equal(saveSprint({ ...state, answers: bank.map(question => ({ id: question.id, correct: true })) }), null);
});

test('audio loads through four workers and releases earlier question batches', async () => {
    const audio = new BattleAudio();
    let active = 0, peak = 0;
    audio.load = async (id) => {
        const voice = !['drums', 'music', 'bomb-hit'].includes(id);
        if (voice) { active++; peak = Math.max(peak, active); }
        await new Promise(resolve => setTimeout(resolve, 0));
        audio.buffers.set(id, { duration: 1 });
        if (voice) active--;
    };
    const old = Array.from({ length: 12 }, (_, i) => ({ id: `old-${i}`, grammar: true }));
    const next = Array.from({ length: 12 }, (_, i) => ({ id: `new-${i}`, grammar: true }));
    await audio.preload(old);
    assert.ok(audio.ready(old[0]));
    await audio.preload(next);
    audio.retain(next);
    assert.ok(peak <= 4);
    assert.equal(audio.ready(old[0]), false);
    assert.ok(next.every(question => audio.ready(question)));
    assert.equal(audio.buffers.size, 27);
});

test('audio interruption keeps the original clock rather than jumping to page time', () => {
    const audio = new BattleAudio();
    audio.context = { currentTime: 12.5, state: 'suspended' };
    audio.clockMode = 'audio';
    assert.equal(audio.now(), 12.5);
});

test('feedback includes the whole vocal echo even for an answer just before a bar boundary', () => {
    const audio = new BattleAudio();
    audio.origin = 0;
    audio.now = () => 2.49;
    audio.buffers.set('short-phrase', { duration: 1.14 });
    const end = audio.feedbackEnd('short-phrase');
    const lastVoice = audio.nextBeat(audio.now() + 0.06) + 1.14 + BEAT_SECONDS * 2;
    assert.ok(end >= lastVoice);
    assert.equal(end % (BEAT_SECONDS * 4), 0);
});

test('normal allows ten seconds and scores speed as a proportion of its own time limit', () => {
    const questions = chapters[0].questions.slice(0, 1);
    const normal = { ...startBattle(questions), phase: 'question' };
    const hard = { ...startBattle(questions, { difficulty: 'hard' }), phase: 'question' };
    assert.equal(normal.seconds, 10);
    assert.equal(hard.seconds, 5);
    assert.equal(resolveAnswer(normal, questions[0].answer, 8).score, resolveAnswer(hard, questions[0].answer, 4).score);
    assert.equal(resolveAnswer(normal, questions[0].answer, 0).answers[0].seconds, 10);
    assert.equal(resolveAnswer(hard, questions[0].answer, 0).answers[0].seconds, 5);
});

test('short rounds mix weak questions with fresh content, without duplicates or losing the full bank', () => {
    const bank = chapters[0].questions;
    const progress = Object.fromEntries(bank.slice(0, 8).map(question => [question.id, { correct: 0, wrong: 1, streak: 0 }]));
    const round = selectQuestions(bank, { progress, random: () => 0 });
    assert.equal(round.length, 10);
    assert.equal(new Set(round.map(question => question.id)).size, 10);
    assert.equal(round.filter(question => progress[question.id]).length, 3);
    assert.equal(selectQuestions(bank, { mode: 'full' }).length, 60);
    assert.equal(selectQuestions(bank, { mode: 'review', progress }).length, 8);
    const topic = bank.at(-1).topic;
    assert.ok(selectQuestions(bank, { topic }).every(question => question.topic === topic));
    assert.deepEqual(selectQuestions(bank, { count: 0 }), []);
});

test('mistakes persist, two correct encounters mark fluency, and another error returns the question to review', () => {
    const question = chapters[0].questions[0];
    const bank = [question];
    let progress = updateLearning({}, [{ id: question.id, correct: false }], 1000);
    assert.equal(learningStats(bank, progress).review, 1);
    progress = updateLearning(progress, [{ id: question.id, correct: true }], 2000);
    assert.equal(progress[question.id].dueAt, 2000 + 86400000);
    assert.equal(learningStats(bank, progress).mastered, 0);
    progress = updateLearning(progress, [{ id: question.id, correct: true }], 3000);
    assert.equal(learningStats(bank, progress).mastered, 1);
    assert.equal(learningStats(bank, progress).review, 0);
    progress = updateLearning(progress, [{ id: question.id, correct: false }], 4000);
    assert.equal(learningStats(bank, progress).review, 1);
    assert.equal(learningStats(bank, progress).mastered, 0);
});
