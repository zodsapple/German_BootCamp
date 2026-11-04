export const BPM = 96;
export const BEAT_SECONDS = 60 / BPM;
export const DIFFICULTIES = {
    normal: { label: '普通', seconds: 10, beats: 16 },
    hard: { label: '困难', seconds: 5, beats: 8 },
};
export const FEEDBACK_SECONDS = BEAT_SECONDS * 4;
export const PALACE_RANKS = ['初入宫门', '仆人', '宫女', '答应', '常在', '贵人', '嫔', '妃', '贵妃', '皇后', '皇帝'];

export function battleGrade(state) {
    const planned = state.questions.length;
    const total = state.answers.length;
    const correct = state.answers.filter(answer => answer.correct).length;
    const rating = total > 0 ? Math.min(total === planned ? 10 : 9, Math.floor(correct / total * 10)) : 0;
    return { rating, title: PALACE_RANKS[rating], correct, total, planned, unanswered: planned - total };
}

export function initialBattle(difficulty = 'normal') {
    const selected = DIFFICULTIES[difficulty] ? difficulty : 'normal';
    return { phase: 'lobby', mode: 'quick', stageId: null, difficulty: selected, seconds: DIFFICULTIES[selected].seconds, index: 0, hearts: 3, combo: 0, bestCombo: 0, score: 0, answers: [], questions: [] };
}

export function startBattle(questions, { difficulty = 'normal', mode = 'quick', stageId = null, topic = 'all', random = Math.random } = {}) {
    return {
        ...initialBattle(difficulty),
        phase: 'countdown',
        mode,
        stageId,
        topic,
        questions: questions.map(question => {
            const options = [...question.options];
            for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
            }
            return { ...question, options };
        }),
    };
}

export function resolveAnswer(state, choice, secondsLeft) {
    if (state.phase !== 'question') return state;
    const question = state.questions[state.index];
    // A late click is a timeout, even if the animation frame has not fired yet.
    const timedOut = secondsLeft <= 0 || choice === null;
    const correct = !timedOut && choice === question.answer;
    const combo = correct ? state.combo + 1 : 0;
    const elapsed = Math.max(0, Math.min(state.seconds, state.seconds - secondsLeft));
    const points = correct ? 100 + Math.round((1 - elapsed / state.seconds) * 100) + (combo >= 3 ? 50 : 0) : 0;
    return {
        ...state,
        phase: 'feedback',
        hearts: Math.max(0, state.hearts - (correct ? 0 : 1)),
        combo,
        bestCombo: Math.max(state.bestCombo, combo),
        score: state.score + points,
        answers: [...state.answers, { id: question.id, choice: timedOut ? null : choice, correct, seconds: elapsed, points }],
    };
}

export function advanceBattle(state) {
    if (state.phase !== 'feedback') return state;
    return (state.mode !== 'full' && state.hearts <= 0) || state.index === state.questions.length - 1
        ? { ...state, phase: 'result' }
        : { ...state, phase: 'question', index: state.index + 1, hearts: state.hearts <= 0 ? 3 : state.hearts };
}

export function enemyHealth(state) {
    return Math.max(0, 100 - state.answers.filter(answer => answer.correct).length * (100 / (state.questions.length || 5)));
}

export function missedQuestions(state) {
    const wrong = new Set(state.answers.filter(answer => !answer.correct).map(answer => answer.id));
    return state.questions.filter(question => wrong.has(question.id));
}

export function unansweredQuestions(state) {
    const answered = new Set(state.answers.map(answer => answer.id));
    return state.questions.filter(question => !answered.has(question.id));
}
