export const BPM = 96;
export const BEAT_SECONDS = 60 / BPM;
export const ANSWER_SECONDS = BEAT_SECONDS * 8;
export const FEEDBACK_SECONDS = BEAT_SECONDS * 4;

export function initialBattle() {
    return { phase: 'lobby', index: 0, hearts: 3, combo: 0, bestCombo: 0, score: 0, answers: [], questions: [] };
}

export function startBattle(questions, random = Math.random) {
    return {
        ...initialBattle(),
        phase: 'countdown',
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
    const points = correct ? 100 + Math.round(Math.max(0, Math.min(ANSWER_SECONDS, secondsLeft)) * 20) + (combo >= 3 ? 50 : 0) : 0;
    return {
        ...state,
        phase: 'feedback',
        hearts: state.hearts - (correct ? 0 : 1),
        combo,
        bestCombo: Math.max(state.bestCombo, combo),
        score: state.score + points,
        answers: [...state.answers, { id: question.id, choice: timedOut ? null : choice, correct, seconds: Math.max(0, ANSWER_SECONDS - secondsLeft), points }],
    };
}

export function advanceBattle(state) {
    if (state.phase !== 'feedback') return state;
    return state.hearts <= 0 || state.index === state.questions.length - 1
        ? { ...state, phase: 'result' }
        : { ...state, phase: 'question', index: state.index + 1 };
}

export function enemyHealth(state) {
    return Math.max(0, 100 - state.answers.filter(answer => answer.correct).length * (100 / (state.questions.length || 5)));
}

export function missedQuestions(state) {
    const answeredCorrectly = new Set(state.answers.filter(answer => answer.correct).map(answer => answer.id));
    return state.questions.filter(question => !answeredCorrectly.has(question.id));
}
