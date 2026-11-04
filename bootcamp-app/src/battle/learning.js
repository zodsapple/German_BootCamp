function shuffled(items, random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export function needsReview(entry) {
    return Boolean(entry?.wrong > 0 && entry.streak < 2);
}

export function selectQuestions(bank, { progress = {}, mode = 'quick', topic = 'all', count = 10, random = Math.random, now = Date.now() } = {}) {
    if (count <= 0) return [];
    const available = bank.filter(question => topic === 'all' || (question.topic || '基础训练') === topic);
    const review = shuffled(available.filter(question => needsReview(progress[question.id])), random);
    if (mode === 'review') return review.slice(0, count);
    if (mode === 'full') return shuffled(available, random);
    const unseen = shuffled(available.filter(question => !progress[question.id]), random);
    const due = shuffled(available.filter(question => progress[question.id]?.dueAt <= now && !needsReview(progress[question.id])), random);
    const rest = shuffled(available, random);
    const selected = [];
    const ids = new Set();
    // A few weak questions recur, while most of a short round advances through the bank.
    for (const question of [...review.slice(0, 3), ...unseen, ...due, ...review.slice(3), ...rest]) {
        if (ids.has(question.id)) continue;
        ids.add(question.id);
        selected.push(question);
        if (selected.length === count) break;
    }
    return selected;
}

export function updateLearning(progress, answers, now = Date.now()) {
    const next = { ...progress };
    for (const answer of answers) {
        const previous = next[answer.id] || { correct: 0, wrong: 0, streak: 0 };
        const streak = answer.correct ? previous.streak + 1 : 0;
        const days = streak === 1 ? 1 : streak === 2 ? 3 : 7;
        next[answer.id] = {
            correct: previous.correct + Number(answer.correct),
            wrong: previous.wrong + Number(!answer.correct),
            streak,
            lastSeen: now,
            dueAt: answer.correct ? now + days * 86400000 : now,
        };
    }
    return next;
}

export function learningStats(bank, progress) {
    return {
        seen: bank.filter(question => progress[question.id]).length,
        mastered: bank.filter(question => progress[question.id]?.streak >= 2).length,
        review: bank.filter(question => needsReview(progress[question.id])).length,
    };
}

export function saveSprint(game, now = Date.now()) {
    if (game.mode !== 'full' || !game.questions.length || game.answers.length >= game.questions.length) return null;
    return {
        ids: game.questions.map(question => question.id),
        answers: game.answers,
        difficulty: game.difficulty,
        topic: game.topic || 'all',
        hearts: game.hearts,
        combo: game.combo,
        bestCombo: game.bestCombo,
        score: game.score,
        savedAt: now,
    };
}

export function restoreSprint(saved, bank) {
    if (!Array.isArray(saved?.ids) || !Array.isArray(saved.answers) || !saved.ids.length || saved.answers.length >= saved.ids.length) return null;
    const byId = new Map(bank.map(question => [question.id, question]));
    if (new Set(saved.ids).size !== saved.ids.length || saved.ids.some(id => !byId.has(id))) return null;
    if (saved.answers.some((answer, index) => answer.id !== saved.ids[index] || typeof answer.correct !== 'boolean')) return null;
    return {
        questions: saved.ids.map(id => byId.get(id)),
        answers: saved.answers,
        index: saved.answers.length,
        difficulty: saved.difficulty === 'hard' ? 'hard' : 'normal',
        topic: typeof saved.topic === 'string' ? saved.topic : 'all',
        hearts: Math.max(1, Math.min(3, Number(saved.hearts) || 3)),
        combo: Number(saved.combo) || 0,
        bestCombo: Number(saved.bestCombo) || 0,
        score: Number(saved.score) || 0,
    };
}
