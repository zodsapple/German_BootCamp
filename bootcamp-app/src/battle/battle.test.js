import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { ANSWER_SECONDS, BEAT_SECONDS, advanceBattle, enemyHealth, missedQuestions, resolveAnswer, startBattle } from './battleEngine.js';
import { BattleAudio } from './battleAudio.js';

const chapters = JSON.parse(readFileSync(new URL('./questions.json', import.meta.url), 'utf8'));

test('all 15 bilingual questions have one distinct answer and a nonempty MP3', () => {
    assert.deepEqual(chapters.map(chapter => chapter.questions.length), [5, 5, 5]);
    const ids = new Set();
    for (const chapter of chapters) for (const question of chapter.questions) {
        assert.ok(!ids.has(question.id));
        ids.add(question.id);
        assert.equal(question.options.filter(option => option === question.answer).length, 1);
        assert.equal(new Set(question.options).size, question.options.length);
        for (const key of ['promptDe', 'promptZh', 'solutionDe', 'solutionZh', 'rule', 'chant', 'chantZh']) assert.ok(question[key]);
        if (question.promptDe.includes('___')) assert.equal(question.promptDe.replace('___', question.answer), question.solutionDe);
        const audio = new URL(`../../public/audio/battle/${question.id}.mp3`, import.meta.url);
        assert.ok(statSync(audio).size > 1000);
        if (question.source) {
            const day = JSON.parse(readFileSync(new URL(`../data/day${question.source.day}.json`, import.meta.url), 'utf8'));
            assert.ok(day.vocab.some(word => word.word === question.source.word && word.word === question.chant));
        }
    }
});

test('eight beats provide exactly five seconds; shuffling preserves answers and source content', () => {
    assert.equal(BEAT_SECONDS * 8, 5);
    assert.equal(ANSWER_SECONDS, 5);
    const questions = chapters[0].questions;
    const original = JSON.stringify(questions);
    const state = startBattle(questions, () => 0);
    assert.equal(JSON.stringify(questions), original);
    assert.notDeepEqual(state.questions[0].options, questions[0].options);
    assert.deepEqual(new Set(state.questions[0].options), new Set(questions[0].options));
});

test('one click can score only once; late correct clicks count as timeouts', () => {
    const question = chapters[0].questions[0];
    const state = { ...startBattle([question]), phase: 'question' };
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
    let state = { ...startBattle(chapters[1].questions), phase: 'question' };
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

test('three mistakes end a round and revenge includes wrong and unseen questions', () => {
    let state = { ...startBattle(chapters[2].questions), phase: 'question' };
    state = advanceBattle(resolveAnswer(state, state.questions[0].answer, 3));
    for (let i = 0; i < 3; i++) state = advanceBattle(resolveAnswer(state, null, 0));
    assert.equal(state.phase, 'result');
    assert.equal(state.hearts, 0);
    assert.equal(state.answers.length, 4);
    assert.equal(missedQuestions(state).length, 4);
    const revenge = startBattle(missedQuestions(state));
    assert.equal(revenge.hearts, 3);
    assert.equal(revenge.score, 0);
    assert.ok(revenge.questions.every(question => question.id !== state.questions[0].id));
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
